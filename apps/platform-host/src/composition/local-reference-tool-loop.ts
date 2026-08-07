import type { ExecutionContext } from '@agentforge/foundation';
import type { CapabilityBinding, CapabilityResolver, CapabilityRequest } from '@agentforge/capability-resolution';
import type {
  AiExecutionRequest,
  AiMessage,
  AiProviderFramework,
  AiToolDefinition,
  AiToolContinuationResult,
  NormalizedAiResult,
  NormalizedToolCall,
} from '@agentforge/ai-provider';
import { buildToolContinuationMessages } from '@agentforge/ai-provider';
import type {
  CapabilityExecutionControl,
  CapabilityStreamEvent,
  CheckpointNormalizedToolCall,
  ToolLoopCallCheckpoint,
  ToolLoopCheckpoint,
} from '@agentforge/runtime';
import type {
  AiToolCallHandoff,
  NormalizedToolResult,
  ToolAdapterResolver,
  ToolEventPublisher,
  ToolInvocationCoordinator,
  ToolRegistry,
  ToolValidator,
} from '@agentforge/tool-framework';
import { NormalizedToolError } from '@agentforge/tool-framework';
import type { AuthorizationDecision, AuthorizationRequest, Principal, SecurityPlatform } from '@agentforge/security';
import type { NodeExecutionContract } from '@agentforge/workflow';
import {
  LOCAL_POLICY_VERSION,
  LOCAL_PROJECT,
  LOCAL_TENANT,
  LOCAL_WORKSPACE,
} from '../config/local-reference-config.js';

export interface ToolLoopLimits {
  readonly enabled: boolean;
  readonly maxCallsPerInvocation: number;
  readonly maxTurns: number;
  readonly maxArgumentBytes: number;
  readonly maxResultBytes: number;
  readonly agentMaxToolInvocations: number;
}

export interface ToolLoopDeps {
  readonly ai: AiProviderFramework;
  readonly tools: ToolRegistry;
  readonly coordinator: ToolInvocationCoordinator;
  readonly validator: ToolValidator;
  readonly adapters: ToolAdapterResolver;
  readonly handoff: AiToolCallHandoff;
  readonly events: ToolEventPublisher;
  readonly security: SecurityPlatform;
  readonly resolver: CapabilityResolver;
  readonly principal: Principal;
  readonly limits: ToolLoopLimits;
  readonly toolDefinitions: () => readonly AiToolDefinition[];
}

export async function runAiToolLoop(
  deps: ToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  objective: string,
  signal: AbortSignal,
  control: CapabilityExecutionControl | undefined,
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
): Promise<NormalizedAiResult> {
  if (!deps.limits.enabled) {
    return deps.ai.execute(makeAiRequest(binding, context, signal, false, userMessages(objective), undefined));
  }

  const existing = await control?.loadToolLoop();
  if (existing !== undefined) {
    return resumeToolLoop(deps, binding, context, signal, existing, control, emit);
  }

  const maxCalls = Math.min(deps.limits.maxCallsPerInvocation, deps.limits.agentMaxToolInvocations);
  let messages: AiMessage[] = userMessages(objective);
  let turn = 0;
  let totalCalls = 0;
  const seenIds = new Set<string>();
  const toolsOffered = deps.toolDefinitions();

  while (turn < deps.limits.maxTurns) {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const result = await deps.ai.execute(makeAiRequest(binding, context, signal, false, messages, toolsOffered));
    if (result.finishReason !== 'tool-calls' || result.toolCalls.length === 0) {
      return result;
    }
    assertUniqueProposedIds(result.toolCalls, seenIds);
    if (totalCalls + result.toolCalls.length > maxCalls) {
      throw new NormalizedToolError('TOOL_REJECTED', 'TOOL_MAX_CALLS_PER_INVOCATION exceeded', false, `tool:${context.executionId}`);
    }

    const turnBase = messages;
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
      const outcome = await admitAndExecuteCall(deps, context, signal, call, turn, control, envelope, admitted, emit);
      admitted.push(outcome.call);
      continuationResults.push(outcome.continuation);
      seenIds.add(call.id);
      envelope = Object.freeze({ ...envelope, calls: Object.freeze([...admitted]) });
    }

    // Durable baseMessages remain the pre-proposal turn base so post-tool recovery can rebuild
    // AiToolContinuationInput without re-executing tools or re-calling the proposing AI turn.
    await control?.persistToolLoop(
      Object.freeze({
        turn,
        maxTurns: deps.limits.maxTurns,
        baseMessages: serializeMessages(turnBase),
        proposedCalls,
        calls: Object.freeze(admitted),
      }),
    );

    messages = [
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

export async function* streamAiWithOptionalTools(
  deps: ToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  objective: string,
  signal: AbortSignal,
  control: CapabilityExecutionControl | undefined,
  workflowId: string,
): AsyncIterable<CapabilityStreamEvent> {
  let sequence = 0;
  if (!deps.limits.enabled) {
    const final = await collectStream(deps, binding, context, signal, userMessages(objective), undefined, (event) => {
      // forwarded below
      void event;
    });
    // re-stream for SSE content: run stream again would duplicate AI — instead emit from collected
    for (const part of final.content) {
      if (part.type === 'text' && part.text.length > 0) {
        yield { type: 'delta', sequence: sequence++, payload: Object.freeze({ kind: 'text' as const, text: part.text }) };
      }
    }
    if (final.usage.totalTokens > 0) {
      yield { type: 'usage', sequence: sequence++, usage: Object.freeze({ ...final.usage }) };
    }
    yield {
      type: 'final',
      sequence: sequence++,
      result: Object.freeze({
        bindings: Object.freeze([binding]),
        aiResult: final,
        planId: `plan:${context.executionId}`,
        workflowId,
      }),
    };
    return;
  }

  // Tool-enabled streaming: execute tool loop (non-stream AI rounds) then stream final continuation text chunks via reference stream semantics
  const lifecycle: CapabilityStreamEvent[] = [];
  const result = await runAiToolLoop(deps, binding, context, objective, signal, control, async (event) => {
    lifecycle.push(event);
  });

  for (const event of lifecycle) {
    if (event.type === 'delta') {
      yield { ...event, sequence: sequence++ };
    }
  }

  for (const part of result.content) {
    if (part.type === 'text' && part.text.length > 0) {
      // chunk like reference stream for SSE continuity
      const chunks = part.text.match(/(\s+|\S+)/g) ?? [part.text];
      for (const chunk of chunks) {
        yield { type: 'delta', sequence: sequence++, payload: Object.freeze({ kind: 'text' as const, text: chunk }) };
      }
    }
  }
  yield { type: 'usage', sequence: sequence++, usage: Object.freeze({ ...result.usage }) };
  yield {
    type: 'final',
    sequence: sequence++,
    result: Object.freeze({
      bindings: Object.freeze([binding]),
      aiResult: result,
      planId: `plan:${context.executionId}`,
      workflowId,
    }),
  };
}

async function collectStream(
  deps: ToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  signal: AbortSignal,
  messages: readonly AiMessage[],
  tools: readonly AiToolDefinition[] | undefined,
  _onEvent: (event: CapabilityStreamEvent) => void,
): Promise<NormalizedAiResult> {
  const request = makeAiRequest(binding, context, signal, true, messages, tools);
  let text = '';
  let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
  let diagnosticId = `ai:${request.requestId}`;
  let sawTerminal = false;
  for await (const event of deps.ai.stream(request)) {
    switch (event.type) {
      case 'content':
        if (event.part.type === 'text') text += event.part.text;
        break;
      case 'usage':
        usage = { ...event.usage };
        break;
      case 'completed':
        finishReason = event.finishReason;
        diagnosticId = event.diagnosticId;
        sawTerminal = true;
        break;
      case 'failed':
        throw Object.assign(new Error(event.message), { code: event.code, retryable: event.retryable });
      case 'cancelled':
        throw new TypeError('Capability execution aborted');
      case 'tool-call':
        throw new TypeError('Unexpected tool-call when tools disabled');
    }
  }
  if (!sawTerminal) throw new TypeError('AI stream ended without terminal event');
  return Object.freeze({
    requestId: request.requestId,
    content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
    usage: Object.freeze(usage),
    model: Object.freeze({ id: binding.implementationId, capabilities: Object.freeze([binding.capability]) }),
    finishReason,
    toolCalls: Object.freeze([]),
    diagnosticId,
    metadata: Object.freeze({ source: 'local-reference', mode: 'stream' }),
  });
}

async function resumeToolLoop(
  deps: ToolLoopDeps,
  binding: CapabilityBinding,
  context: ExecutionContext,
  signal: AbortSignal,
  toolLoop: ToolLoopCheckpoint,
  control: CapabilityExecutionControl | undefined,
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
): Promise<NormalizedAiResult> {
  const messages = deserializeMessages(toolLoop.baseMessages);
  const admitted = [...toolLoop.calls];
  const continuationResults: AiToolContinuationResult[] = [];
  const seenIds = new Set<string>();

  for (const proposed of toolLoop.proposedCalls) {
    seenIds.add(proposed.id);
    const existing = admitted.find((item) => item.toolCall.id === proposed.id);
    if (existing?.stage === 'post-tool' && existing.result !== undefined) {
      continuationResults.push(resultToContinuation(proposed.id, existing.result as NormalizedToolResult));
      continue;
    }
    if (existing?.stage === 'pre-tool') {
      const contract = deps.tools.get(proposed.name);
      if (contract === undefined) {
        throw new NormalizedToolError('TOOL_NOT_FOUND', `Unknown tool ${proposed.name}`, false, `tool:${context.executionId}`);
      }
      if (contract.idempotency === 'non-idempotent') {
        throw new NormalizedToolError(
          'TOOL_UNSAFE_RECOVERY',
          'Cannot safely retry non-idempotent tool after pre-tool',
          false,
          `tool:${context.executionId}:${proposed.id}`,
        );
      }
      const call: NormalizedToolCall = { id: proposed.id, name: proposed.name, arguments: { ...proposed.arguments } };
      const prior = admitted.filter((item) => item.toolCall.id !== proposed.id);
      const outcome = await invokeAfterPreTool(deps, context, signal, call, existing, control, toolLoop, prior, emit);
      const idx = admitted.findIndex((item) => item.toolCall.id === proposed.id);
      if (idx >= 0) admitted[idx] = outcome.call;
      continuationResults.push(outcome.continuation);
      continue;
    }
    const call: NormalizedToolCall = { id: proposed.id, name: proposed.name, arguments: { ...proposed.arguments } };
    const outcome = await admitAndExecuteCall(
      deps,
      context,
      signal,
      call,
      toolLoop.turn,
      control,
      toolLoop,
      admitted.filter((item) => item.stage === 'post-tool'),
      emit,
    );
    admitted.push(outcome.call);
    continuationResults.push(outcome.continuation);
  }

  const toolCalls = toolLoop.proposedCalls.map((call) =>
    Object.freeze({ id: call.id, name: call.name, arguments: Object.freeze({ ...call.arguments }) }),
  );
  const continuationMessages = buildToolContinuationMessages({
    baseMessages: messages,
    toolCalls,
    results: continuationResults,
  });
  return deps.ai.execute(makeAiRequest(binding, context, signal, false, continuationMessages, deps.toolDefinitions()));
}

async function admitAndExecuteCall(
  deps: ToolLoopDeps,
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
  await publish(deps, 'tool.requested', requestId, context.executionId, call.name);

  const contract = deps.tools.get(call.name);
  if (contract === undefined) {
    await publish(deps, 'tool.denied', requestId, context.executionId, call.name);
    throw new NormalizedToolError('TOOL_NOT_FOUND', `Unknown tool ${call.name}`, false, `tool:${requestId}`);
  }

  deps.validator.assertArgumentBytes(call.arguments, deps.limits.maxArgumentBytes, requestId);
  const required = Array.isArray(contract.inputSchema.required) ? contract.inputSchema.required : [];
  if (!required.every((key) => typeof key === 'string' && key in call.arguments)) {
    throw new NormalizedToolError('TOOL_VALIDATION', 'Required tool parameters are missing', false, `tool:${requestId}`);
  }

  const decision = await authorizeTool(deps.security, deps.principal, context, contract.id);
  if (!decision.authorized) {
    await publish(deps, 'tool.denied', requestId, context.executionId, contract.id, contract);
    throw new NormalizedToolError('TOOL_AUTHORIZATION', 'Tool authorization denied', false, `tool:${requestId}`);
  }
  await publish(deps, 'tool.authorized', requestId, context.executionId, contract.id, contract);

  if ((contract.approvalRequirement ?? 'none') === 'required') {
    await publish(deps, 'tool.approval-required', requestId, context.executionId, contract.id, contract);
    throw new NormalizedToolError('TOOL_APPROVAL_REQUIRED', 'Tool requires human approval', false, `tool:${requestId}`);
  }

  const node = toolNode(context.executionId, call.id, contract.capability);
  const toolBinding = await deps.resolver.resolve(
    Object.freeze({
      requestId: `${context.executionId}:tool:${call.id}`,
      capability: contract.capability,
      context,
      node,
      constraints: Object.freeze({}),
    } satisfies CapabilityRequest),
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

  await publish(deps, 'tool.started', requestId, context.executionId, contract.id, contract);
  await emit?.({
    type: 'delta',
    sequence: 0,
    payload: Object.freeze({ kind: 'tool_call' as const, toolCallId: call.id, toolId: contract.id, status: 'executing' }),
  });

  return invokeAfterPreTool(deps, context, signal, call, preTool, control, envelope, priorAdmitted, emit, decision, toolBinding, node);
}

async function invokeAfterPreTool(
  deps: ToolLoopDeps,
  context: ExecutionContext,
  signal: AbortSignal,
  call: NormalizedToolCall,
  preTool: ToolLoopCallCheckpoint,
  control: CapabilityExecutionControl | undefined,
  envelope: ToolLoopCheckpoint,
  priorAdmitted: readonly ToolLoopCallCheckpoint[],
  emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
  decision?: AuthorizationDecision,
  toolBinding?: CapabilityBinding,
  node?: NodeExecutionContract,
): Promise<Readonly<{ call: ToolLoopCallCheckpoint; continuation: AiToolContinuationResult }>> {
  const requestId = `${context.executionId}:${call.id}`;
  const contract = deps.tools.get(call.name);
  if (contract === undefined) {
    throw new NormalizedToolError('TOOL_NOT_FOUND', `Unknown tool ${call.name}`, false, `tool:${requestId}`);
  }

  const resolvedNode = node ?? toolNode(context.executionId, call.id, contract.capability);
  const binding =
    toolBinding ??
    (await deps.resolver.resolve(
      Object.freeze({
        requestId: `${context.executionId}:tool:${call.id}:retry`,
        capability: contract.capability,
        context,
        node: resolvedNode,
        constraints: Object.freeze({}),
      } satisfies CapabilityRequest),
    ));
  const authDecision =
    decision ?? (await authorizeTool(deps.security, deps.principal, context, contract.id));
  if (!authDecision.authorized) {
    throw new NormalizedToolError('TOOL_AUTHORIZATION', 'Tool authorization denied', false, `tool:${requestId}`);
  }

  const toolRequest = deps.handoff.create(call, {
    binding,
    node: resolvedNode,
    context,
    authorization: Object.freeze({ authorized: true as const, decisionId: authDecision.id }),
    idempotencyKey: preTool.idempotencyKey,
    metadata: Object.freeze({}),
    validation: Object.freeze({ schemaVersion: '1' }),
    constraints: Object.freeze({}),
    signal,
  });

  let result: NormalizedToolResult;
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
    payload: Object.freeze({ kind: 'tool_result' as const, toolCallId: call.id, toolId: contract.id, status: 'completed' }),
  });
  return Object.freeze({ call: postTool, continuation: resultToContinuation(call.id, result) });
}

function resultToContinuation(toolCallId: string, result: NormalizedToolResult): AiToolContinuationResult {
  return Object.freeze({
    toolCallId,
    content: Object.freeze([Object.freeze({ type: 'text' as const, text: JSON.stringify(result.data) })]),
  });
}

function toolNode(executionId: string, callId: string, capability: string): NodeExecutionContract {
  return Object.freeze({
    workflowId: `workflow:${executionId}`,
    nodeId: `tool:${callId}`,
    kind: 'capability' as const,
    capability,
  });
}

async function publish(
  deps: ToolLoopDeps,
  type: 'tool.requested' | 'tool.authorized' | 'tool.denied' | 'tool.started' | 'tool.approval-required',
  requestId: string,
  executionId: string,
  toolId: string,
  contract?: { sideEffect: 'read-only' | 'mutating' | 'external-side-effect'; idempotency: 'idempotent' | 'non-idempotent' },
): Promise<void> {
  await deps.events.publish(
    Object.freeze({
      type,
      requestId,
      executionId,
      diagnosticId: `tool:${requestId}`,
      toolId,
      ...(contract === undefined ? {} : { sideEffect: contract.sideEffect, idempotency: contract.idempotency }),
    }),
  );
}

function assertUniqueProposedIds(calls: readonly NormalizedToolCall[], seen: Set<string>): void {
  const local = new Set<string>();
  for (const call of calls) {
    if (local.has(call.id) || seen.has(call.id)) {
      throw new NormalizedToolError('TOOL_VALIDATION', `Duplicate or conflicting toolCallId ${call.id}`, false, `tool:${call.id}`);
    }
    local.add(call.id);
  }
}

function toCheckpointCall(call: NormalizedToolCall): CheckpointNormalizedToolCall {
  return Object.freeze({ id: call.id, name: call.name, arguments: Object.freeze({ ...call.arguments }) });
}

function serializeMessages(messages: readonly AiMessage[]): unknown {
  return JSON.parse(JSON.stringify(messages)) as unknown;
}

function deserializeMessages(value: unknown): AiMessage[] {
  return Array.isArray(value) ? (value as AiMessage[]) : [];
}

function userMessages(objective: string): AiMessage[] {
  return [
    Object.freeze({
      role: 'user' as const,
      content: Object.freeze([Object.freeze({ type: 'text' as const, text: objective })]),
    }),
  ];
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
    requestId: `${context.executionId}:${binding.bindingId}:${String(Math.random()).slice(2, 10)}`,
    binding,
    context,
    messages: Object.freeze([...messages]),
    generation: Object.freeze({ maximumOutputTokens: 128 }),
    ...(streaming ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) } : {}),
    ...(tools === undefined || tools.length === 0 ? {} : { tools: Object.freeze([...tools]) }),
    metadata: Object.freeze({ source: 'local-reference' }),
    constraints: Object.freeze({}),
    signal,
  });
}

async function authorizeTool(
  security: SecurityPlatform,
  principal: Principal,
  context: ExecutionContext,
  toolId: string,
): Promise<AuthorizationDecision> {
  const request: AuthorizationRequest = Object.freeze({
    requestId: `auth:tool:${context.executionId}:${toolId}`,
    requestVersion: '1',
    principal,
    action: 'execute',
    resource: Object.freeze({
      id: `tool:${toolId}`,
      type: 'tool' as const,
      tenantId: LOCAL_TENANT,
      workspaceId: LOCAL_WORKSPACE,
      projectId: LOCAL_PROJECT,
      classification: 'internal' as const,
      securityLabels: Object.freeze(['operations']),
      version: '1',
      metadata: Object.freeze({}),
    }),
    scope: Object.freeze({ tenantId: LOCAL_TENANT, workspaceId: LOCAL_WORKSPACE, projectId: LOCAL_PROJECT }),
    execution: Object.freeze({ executionId: context.executionId, correlationId: context.correlationId }),
    delegationIds: Object.freeze([]),
    capabilityRequirements: Object.freeze([]),
    toolPermissions: Object.freeze([toolId]),
    pluginPermissions: Object.freeze([]),
    environmental: Object.freeze({ profile: 'local-reference-v0.9' }),
    policyContext: Object.freeze({ activePolicySet: 'local-reference', configurationVersion: LOCAL_POLICY_VERSION }),
    occurredAt: new Date().toISOString(),
  });
  return security.authorize(request);
}
