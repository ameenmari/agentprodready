import type {
  AiExecutionRequest,
  AiMessage,
  AiProviderFramework,
  AiToolContinuationResult,
  AiToolDefinition,
  NormalizedAiResult,
  NormalizedToolCall,
} from '@agentprodready/ai-provider';
import { buildToolContinuationMessages } from '@agentprodready/ai-provider';
import type { CapabilityBinding, CapabilityResolver } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type {
  CapabilityExecutionControl,
  CapabilityStreamEvent,
  CheckpointNormalizedToolCall,
  ToolLoopCallCheckpoint,
  ToolLoopCheckpoint,
} from '@agentprodready/runtime';
import type { AuthorizationDecision, Principal, SecurityPlatform } from '@agentprodready/security';
import {
  AiToolCallHandoff,
  NormalizedToolError,
  type ToolAdapterResolver,
  type ToolEventPublisher,
  type ToolInvocationCoordinator,
  type ToolRegistry,
  type ToolValidator,
} from '@agentprodready/tool-framework';
import type { NodeExecutionContract } from '@agentprodready/workflow';
import {
  EMBEDDED_POLICY_VERSION,
  EMBEDDED_PROJECT,
  EMBEDDED_TENANT,
  EMBEDDED_WORKSPACE,
} from './embedded-security.js';

export interface EmbeddedToolLoopLimits {
  readonly maxCallsPerInvocation: number;
  readonly maxTurns: number;
  readonly maxArgumentBytes: number;
  readonly maxResultBytes: number;
}

export interface EmbeddedToolLoopDeps {
  readonly ai: AiProviderFramework;
  readonly tools: ToolRegistry;
  readonly coordinator: ToolInvocationCoordinator;
  readonly validator: ToolValidator;
  readonly adapters: ToolAdapterResolver;
  readonly events: ToolEventPublisher;
  readonly security: SecurityPlatform;
  readonly resolver: CapabilityResolver;
  readonly principal: Principal;
  readonly limits: EmbeddedToolLoopLimits;
  readonly toolDefinitions: () => readonly AiToolDefinition[];
  /** Amendment D — park durable approval wait before failing closed to the caller. */
  readonly onApprovalRequired?: (request: EmbeddedApprovalWaitRequest) => Promise<void>;
  /** When set, resume an approved parked tool call instead of starting fresh. */
  readonly resumeApproval?: EmbeddedApprovalResume | undefined;
}

export interface EmbeddedApprovalWaitRequest {
  readonly approvalId: string;
  readonly executionId: string;
  readonly toolId: string;
  readonly toolCallId: string;
  readonly toolLoop: ToolLoopCheckpoint;
  readonly messages: readonly AiMessage[];
  readonly binding: CapabilityBinding;
  readonly objective: string;
}

export interface EmbeddedApprovalResume {
  readonly approvalId: string;
  readonly toolLoop: ToolLoopCheckpoint;
  readonly messages: readonly AiMessage[];
  readonly binding: CapabilityBinding;
}

export class EmbeddedApprovalRequiredError extends Error {
  public readonly code = 'TOOL_APPROVAL_REQUIRED' as const;
  public constructor(
    public readonly approvalId: string,
    public readonly executionId: string,
    message = 'Tool requires human approval',
  ) {
    super(message);
    this.name = 'EmbeddedApprovalRequiredError';
  }
}

/** Opaque tool-call counts for Simple result metadata (no payloads). */
export interface EmbeddedToolCallSummary {
  readonly invoked: number;
  readonly succeeded: number;
  readonly failed: number;
}

export interface EmbeddedToolLoopOutcome {
  readonly result: NormalizedAiResult;
  readonly tools: EmbeddedToolCallSummary;
}

const handoff = new AiToolCallHandoff();

export async function runEmbeddedToolLoop(
  deps: EmbeddedToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  messages: readonly AiMessage[],
  signal: AbortSignal,
  control: CapabilityExecutionControl | undefined,
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
  objective = '',
): Promise<EmbeddedToolLoopOutcome> {
  if (deps.resumeApproval !== undefined) {
    return resumeApprovedToolLoop(deps, deps.resumeApproval.binding, context, signal, control, emit);
  }

  const existing = await control?.loadToolLoop();
  if (existing !== undefined) {
    const awaiting = existing.calls.find((call) => call.stage === 'awaiting-approval');
    if (awaiting?.approvalId !== undefined) {
      throw new EmbeddedApprovalRequiredError(awaiting.approvalId, context.executionId);
    }
    throw new NormalizedToolError(
      'TOOL_UNSAFE_RECOVERY',
      'Resuming a prior tool loop is not supported without an approved HITL wait',
      false,
      `tool:${context.executionId}`,
    );
  }

  let conversation: AiMessage[] = [...messages];
  let turn = 0;
  let totalCalls = 0;
  let succeeded = 0;
  let failed = 0;
  const seenIds = new Set<string>();
  const toolsOffered = deps.toolDefinitions();

  while (turn < deps.limits.maxTurns) {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const result = await deps.ai.execute(
      makeAiRequest(binding, context, signal, false, conversation, toolsOffered),
    );
    if (result.finishReason !== 'tool-calls' || result.toolCalls.length === 0) {
      return Object.freeze({
        result,
        tools: Object.freeze({ invoked: totalCalls, succeeded, failed }),
      });
    }
    assertUniqueProposedIds(result.toolCalls, seenIds);
    if (totalCalls + result.toolCalls.length > deps.limits.maxCallsPerInvocation) {
      throw new NormalizedToolError(
        'TOOL_REJECTED',
        'TOOL_MAX_CALLS_PER_INVOCATION exceeded',
        false,
        `tool:${context.executionId}`,
      );
    }

    const turnBase = conversation;
    const proposedCalls = result.toolCalls.map(toCheckpointCall);
    let envelope: ToolLoopCheckpoint = Object.freeze({
      turn,
      maxTurns: deps.limits.maxTurns,
      baseMessages: serializeMessages(turnBase),
      proposedCalls,
      calls: Object.freeze([]),
    });
    await control?.persistToolLoop(envelope);

    const admitted: ToolLoopCallCheckpoint[] = [];
    const continuationResults: AiToolContinuationResult[] = [];
    for (const call of result.toolCalls) {
      totalCalls += 1;
      try {
        const outcome = await admitAndExecuteCall(
          deps,
          binding,
          context,
          signal,
          call,
          turn,
          control,
          envelope,
          admitted,
          turnBase,
          emit,
          objective,
        );
        succeeded += 1;
        admitted.push(outcome.call);
        continuationResults.push(outcome.continuation);
        seenIds.add(call.id);
        envelope = Object.freeze({ ...envelope, calls: Object.freeze([...admitted]) });
      } catch (error) {
        failed += 1;
        throw error;
      }
    }

    await control?.persistToolLoop(
      Object.freeze({
        turn,
        maxTurns: deps.limits.maxTurns,
        baseMessages: serializeMessages(turnBase),
        proposedCalls,
        calls: Object.freeze(admitted),
      }),
    );

    conversation = [
      ...buildToolContinuationMessages({
        baseMessages: turnBase,
        toolCalls: result.toolCalls,
        assistantContent: result.content,
        results: continuationResults,
      }),
    ];
    turn += 1;
  }

  throw new NormalizedToolError('TOOL_REJECTED', 'TOOL_MAX_TURNS exceeded', false, `tool:${context.executionId}`);
}

async function admitAndExecuteCall(
  deps: EmbeddedToolLoopDeps,
  capabilityBinding: CapabilityBinding,
  context: ExecutionContext,
  signal: AbortSignal,
  call: NormalizedToolCall,
  turn: number,
  control: CapabilityExecutionControl | undefined,
  envelope: ToolLoopCheckpoint,
  priorAdmitted: readonly ToolLoopCallCheckpoint[],
  turnBase: readonly AiMessage[],
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
  objective = '',
): Promise<Readonly<{ call: ToolLoopCallCheckpoint; continuation: AiToolContinuationResult }>> {
  const requestId = `${context.executionId}:${call.id}`;
  const contract = deps.tools.get(call.name);
  if (contract === undefined) {
    throw new NormalizedToolError('TOOL_NOT_FOUND', `Unknown tool ${call.name}`, false, `tool:${requestId}`);
  }

  deps.validator.assertArgumentBytes(call.arguments, deps.limits.maxArgumentBytes, requestId);
  const required = Array.isArray(contract.inputSchema.required) ? contract.inputSchema.required : [];
  if (!required.every((key) => typeof key === 'string' && key in call.arguments)) {
    throw new NormalizedToolError(
      'TOOL_VALIDATION',
      'Required tool parameters are missing',
      false,
      `tool:${requestId}`,
    );
  }

  const decision = await authorizeTool(deps.security, deps.principal, context, contract.id);
  if (!decision.authorized) {
    await publish(deps, 'tool.denied', requestId, context.executionId, contract.id);
    throw new NormalizedToolError('TOOL_AUTHORIZATION', 'Tool authorization denied', false, `tool:${requestId}`);
  }
  await publish(deps, 'tool.authorized', requestId, context.executionId, contract.id);

  const idempotencyKey = `${context.executionId}:${call.id}`;

  if ((contract.approvalRequirement ?? 'none') === 'required') {
    await publish(deps, 'tool.approval-required', requestId, context.executionId, contract.id);
    const approvalId = `approval:${context.executionId}:${call.id}`;
    const awaiting: ToolLoopCallCheckpoint = Object.freeze({
      turn,
      toolCall: toCheckpointCall(call),
      toolId: contract.id,
      sideEffect: contract.sideEffect,
      idempotency: contract.idempotency,
      idempotencyKey,
      stage: 'awaiting-approval' as const,
      approvalId,
    });
    const toolLoop = Object.freeze({
      ...envelope,
      calls: Object.freeze([...priorAdmitted, awaiting]),
    });
    await control?.persistToolLoop(toolLoop);
    await deps.onApprovalRequired?.({
      approvalId,
      executionId: context.executionId,
      toolId: contract.id,
      toolCallId: call.id,
      toolLoop,
      messages: turnBase,
      binding: capabilityBinding,
      objective,
    });
    throw new EmbeddedApprovalRequiredError(approvalId, context.executionId);
  }

  return executeAdmittedCall(
    deps,
    context,
    signal,
    call,
    turn,
    control,
    envelope,
    priorAdmitted,
    decision,
    idempotencyKey,
    emit,
  );
}

async function resumeApprovedToolLoop(
  deps: EmbeddedToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  signal: AbortSignal,
  control: CapabilityExecutionControl | undefined,
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
): Promise<EmbeddedToolLoopOutcome> {
  const resume = deps.resumeApproval;
  if (resume === undefined) {
    throw new NormalizedToolError('TOOL_UNSAFE_RECOVERY', 'Missing resume approval state', false, `tool:${context.executionId}`);
  }
  const awaiting = resume.toolLoop.calls.find((call) => call.stage === 'awaiting-approval');
  if (awaiting === undefined) {
    throw new NormalizedToolError(
      'TOOL_UNSAFE_RECOVERY',
      'No awaiting-approval checkpoint to resume',
      false,
      `tool:${context.executionId}`,
    );
  }
  const call: NormalizedToolCall = Object.freeze({
    id: awaiting.toolCall.id,
    name: awaiting.toolCall.name,
    arguments: { ...awaiting.toolCall.arguments },
  });
  const decision = await authorizeTool(deps.security, deps.principal, context, awaiting.toolId);
  if (!decision.authorized) {
    throw new NormalizedToolError('TOOL_AUTHORIZATION', 'Tool authorization denied', false, `tool:${context.executionId}`);
  }

  const prior = resume.toolLoop.calls.filter((item) => item.stage !== 'awaiting-approval');
  const envelope: ToolLoopCheckpoint = Object.freeze({
    ...resume.toolLoop,
    calls: Object.freeze(prior),
  });
  const outcome = await executeAdmittedCall(
    deps,
    context,
    signal,
    call,
    awaiting.turn,
    control,
    envelope,
    prior,
    decision,
    awaiting.idempotencyKey,
    emit,
  );

  const turnBase = deserializeMessages(resume.toolLoop.baseMessages);
  const proposed = resume.toolLoop.proposedCalls.map(
    (item): NormalizedToolCall =>
      Object.freeze({ id: item.id, name: item.name, arguments: { ...item.arguments } }),
  );
  let conversation: AiMessage[] = [
    ...buildToolContinuationMessages({
      baseMessages: turnBase,
      toolCalls: proposed,
      assistantContent: Object.freeze([{ type: 'text' as const, text: '' }]),
      results: [outcome.continuation],
    }),
  ];

  let turn = awaiting.turn + 1;
  let totalCalls = 1;
  let succeeded = 1;
  const failed = 0;
  const seenIds = new Set(proposed.map((item) => item.id));
  const toolsOffered = deps.toolDefinitions();

  while (turn < deps.limits.maxTurns) {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const result = await deps.ai.execute(
      makeAiRequest(binding, context, signal, false, conversation, toolsOffered),
    );
    if (result.finishReason !== 'tool-calls' || result.toolCalls.length === 0) {
      return Object.freeze({
        result,
        tools: Object.freeze({ invoked: totalCalls, succeeded, failed }),
      });
    }
    assertUniqueProposedIds(result.toolCalls, seenIds);
    const turnBaseNext = conversation;
    const proposedCalls = result.toolCalls.map(toCheckpointCall);
    let nextEnvelope: ToolLoopCheckpoint = Object.freeze({
      turn,
      maxTurns: deps.limits.maxTurns,
      baseMessages: serializeMessages(turnBaseNext),
      proposedCalls,
      calls: Object.freeze([]),
    });
    const admitted: ToolLoopCallCheckpoint[] = [];
    const continuationResults: AiToolContinuationResult[] = [];
    for (const nextCall of result.toolCalls) {
      totalCalls += 1;
      const nextOutcome = await admitAndExecuteCall(
        deps,
        binding,
        context,
        signal,
        nextCall,
        turn,
        control,
        nextEnvelope,
        admitted,
        turnBaseNext,
        emit,
        '',
      );
      succeeded += 1;
      admitted.push(nextOutcome.call);
      continuationResults.push(nextOutcome.continuation);
      seenIds.add(nextCall.id);
      nextEnvelope = Object.freeze({ ...nextEnvelope, calls: Object.freeze([...admitted]) });
    }
    conversation = [
      ...buildToolContinuationMessages({
        baseMessages: turnBaseNext,
        toolCalls: result.toolCalls,
        assistantContent: result.content,
        results: continuationResults,
      }),
    ];
    turn += 1;
  }

  throw new NormalizedToolError('TOOL_REJECTED', 'TOOL_MAX_TURNS exceeded', false, `tool:${context.executionId}`);
}

async function executeAdmittedCall(
  deps: EmbeddedToolLoopDeps,
  context: ExecutionContext,
  signal: AbortSignal,
  call: NormalizedToolCall,
  turn: number,
  control: CapabilityExecutionControl | undefined,
  envelope: ToolLoopCheckpoint,
  priorAdmitted: readonly ToolLoopCallCheckpoint[],
  decision: AuthorizationDecision,
  idempotencyKey: string,
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
): Promise<Readonly<{ call: ToolLoopCallCheckpoint; continuation: AiToolContinuationResult }>> {
  const requestId = `${context.executionId}:${call.id}`;
  const contract = deps.tools.get(call.name);
  if (contract === undefined) {
    throw new NormalizedToolError('TOOL_NOT_FOUND', `Unknown tool ${call.name}`, false, `tool:${requestId}`);
  }

  const node = toolNode(context.executionId, call.id, contract.capability);
  const toolBinding = await deps.resolver.resolve(
    Object.freeze({
      requestId: `${context.executionId}:tool:${call.id}`,
      capability: contract.capability,
      contractVersion: '1',
      context,
      node,
      constraints: Object.freeze({}),
    }),
  );
  await deps.adapters.resolve(toolBinding);

  const preTool: ToolLoopCallCheckpoint = Object.freeze({
    turn,
    toolCall: toCheckpointCall(call),
    toolId: contract.id,
    sideEffect: contract.sideEffect,
    idempotency: contract.idempotency,
    idempotencyKey,
    stage: 'pre-tool' as const,
  });
  await control?.persistToolLoop(Object.freeze({ ...envelope, calls: Object.freeze([...priorAdmitted, preTool]) }));
  await publish(deps, 'tool.started', requestId, context.executionId, contract.id);
  await emit?.({
    type: 'delta',
    sequence: 0,
    payload: Object.freeze({
      kind: 'tool_call' as const,
      toolCallId: call.id,
      toolId: contract.id,
      status: 'executing',
    }),
  });

  const toolRequest = handoff.create(call, {
    binding: toolBinding,
    node,
    context,
    authorization: Object.freeze({ authorized: true as const, decisionId: decision.id }),
    idempotencyKey,
    metadata: Object.freeze({}),
    validation: Object.freeze({ schemaVersion: '1' }),
    constraints: Object.freeze({}),
    signal,
  });

  let result;
  try {
    result = await deps.coordinator.invoke(toolRequest);
    deps.validator.assertResultBytes(result.data, deps.limits.maxResultBytes, requestId);
  } catch (error) {
    await emit?.({
      type: 'delta',
      sequence: 0,
      payload: Object.freeze({
        kind: 'tool_result' as const,
        toolCallId: call.id,
        toolId: contract.id,
        status: 'failed',
        errorCode: error instanceof NormalizedToolError ? error.code : 'TOOL_UNKNOWN',
      }),
    });
    throw error;
  }

  const postTool: ToolLoopCallCheckpoint = Object.freeze({ ...preTool, stage: 'post-tool' as const, result });
  await control?.persistToolLoop(Object.freeze({ ...envelope, calls: Object.freeze([...priorAdmitted, postTool]) }));
  await emit?.({
    type: 'delta',
    sequence: 0,
    payload: Object.freeze({
      kind: 'tool_result' as const,
      toolCallId: call.id,
      toolId: contract.id,
      status: 'succeeded',
    }),
  });
  await publish(deps, 'tool.completed', requestId, context.executionId, contract.id);

  return Object.freeze({
    call: postTool,
    continuation: Object.freeze({
      toolCallId: call.id,
      content: Object.freeze([
        Object.freeze({ type: 'text' as const, text: JSON.stringify(result.data) }),
      ]),
    }),
  });
}

function deserializeMessages(value: unknown): readonly AiMessage[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value as AiMessage[]);
}

async function authorizeTool(
  security: SecurityPlatform,
  principal: Principal,
  context: ExecutionContext,
  toolId: string,
): Promise<AuthorizationDecision> {
  return security.authorize(
    Object.freeze({
      requestId: `auth:tool:${context.executionId}:${toolId}`,
      requestVersion: '1',
      principal,
      action: 'execute' as const,
      resource: Object.freeze({
        id: `tool:${toolId}`,
        type: 'tool' as const,
        tenantId: EMBEDDED_TENANT,
        workspaceId: EMBEDDED_WORKSPACE,
        projectId: EMBEDDED_PROJECT,
        classification: 'internal' as const,
        securityLabels: Object.freeze(['operations']),
        version: '1',
        metadata: Object.freeze({}),
      }),
      scope: Object.freeze({
        tenantId: EMBEDDED_TENANT,
        workspaceId: EMBEDDED_WORKSPACE,
        projectId: EMBEDDED_PROJECT,
      }),
      execution: Object.freeze({
        executionId: context.executionId,
        correlationId: context.correlationId,
      }),
      delegationIds: Object.freeze([]),
      capabilityRequirements: Object.freeze([]),
      toolPermissions: Object.freeze([toolId]),
      pluginPermissions: Object.freeze([]),
      environmental: Object.freeze({ profile: 'embedded-simple-v1.2' }),
      policyContext: Object.freeze({
        activePolicySet: 'embedded-simple',
        configurationVersion: EMBEDDED_POLICY_VERSION,
      }),
      occurredAt: new Date().toISOString(),
    }),
  );
}

async function publish(
  deps: EmbeddedToolLoopDeps,
  type: 'tool.authorized' | 'tool.denied' | 'tool.started' | 'tool.approval-required' | 'tool.completed',
  requestId: string,
  executionId: string,
  toolId: string,
): Promise<void> {
  await deps.events.publish(
    Object.freeze({
      type,
      requestId,
      executionId,
      diagnosticId: `tool:${requestId}`,
      toolId,
    }),
  );
}

function assertUniqueProposedIds(calls: readonly NormalizedToolCall[], seen: Set<string>): void {
  const local = new Set<string>();
  for (const call of calls) {
    if (local.has(call.id) || seen.has(call.id)) {
      throw new NormalizedToolError(
        'TOOL_VALIDATION',
        `Duplicate or conflicting toolCallId ${call.id}`,
        false,
        `tool:${call.id}`,
      );
    }
    local.add(call.id);
  }
}

function toCheckpointCall(call: NormalizedToolCall): CheckpointNormalizedToolCall {
  return Object.freeze({
    id: call.id,
    name: call.name,
    arguments: Object.freeze({ ...call.arguments }),
  });
}

function serializeMessages(messages: readonly AiMessage[]): unknown {
  return JSON.parse(JSON.stringify(messages)) as unknown;
}

function toolNode(executionId: string, callId: string, capability: string): NodeExecutionContract {
  return Object.freeze({
    workflowId: `workflow:${executionId}`,
    nodeId: `tool:${callId}`,
    kind: 'capability' as const,
    capability,
  });
}

function makeAiRequest(
  binding: CapabilityBinding,
  context: ExecutionContext,
  signal: AbortSignal,
  streaming: boolean,
  messages: readonly AiMessage[],
  tools: readonly AiToolDefinition[] | undefined,
): AiExecutionRequest {
  return Object.freeze({
    requestId: `${context.executionId}:${binding.bindingId}:${crypto.randomUUID().slice(0, 8)}`,
    binding,
    context,
    messages: Object.freeze([...messages]),
    generation: Object.freeze({ maximumOutputTokens: 512 }),
    ...(streaming ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) } : {}),
    ...(tools === undefined || tools.length === 0 ? {} : { tools: Object.freeze([...tools]) }),
    metadata: Object.freeze({ source: 'simple-facade' }),
    constraints: Object.freeze({}),
    signal,
  });
}
