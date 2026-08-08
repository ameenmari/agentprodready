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
): Promise<EmbeddedToolLoopOutcome> {
  const existing = await control?.loadToolLoop();
  if (existing !== undefined) {
    throw new NormalizedToolError(
      'TOOL_UNSAFE_RECOVERY',
      'Resuming a prior tool loop is not supported in the simple Agent API',
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
          context,
          signal,
          call,
          turn,
          control,
          envelope,
          admitted,
          emit,
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
  context: ExecutionContext,
  signal: AbortSignal,
  call: NormalizedToolCall,
  turn: number,
  control: CapabilityExecutionControl | undefined,
  envelope: ToolLoopCheckpoint,
  priorAdmitted: readonly ToolLoopCallCheckpoint[],
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
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

  if ((contract.approvalRequirement ?? 'none') === 'required') {
    await publish(deps, 'tool.approval-required', requestId, context.executionId, contract.id);
    throw new NormalizedToolError(
      'TOOL_APPROVAL_REQUIRED',
      'Tool requires human approval',
      false,
      `tool:${requestId}`,
    );
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

  const idempotencyKey = `${context.executionId}:${call.id}`;
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
  type: 'tool.authorized' | 'tool.denied' | 'tool.started' | 'tool.approval-required',
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
