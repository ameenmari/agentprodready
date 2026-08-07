import type { ExecutionContext } from '@agentforge/foundation';
import type { CapabilityBinding, CapabilityRequest, CapabilityResolver } from '@agentforge/capability-resolution';
import type {
  CapabilityExecutionControl,
  CapabilityInvocationPort,
  CapabilityStreamEvent,
} from '@agentforge/runtime';
import type { NodeExecutionContract } from '@agentforge/workflow';
import type { AiProviderFramework, NormalizedAiResult } from '@agentforge/ai-provider';
import { runAiToolLoop, streamAiWithOptionalTools, type ToolLoopDeps } from './local-reference-tool-loop.js';
import {
  executeAiWithRouting,
  streamAiWithRouting,
  textGenerationRequest,
  type AiRoutingDeps,
} from './local-reference-ai-routing.js';

export interface LocalCapabilityExecutionOutput {
  readonly bindings: readonly CapabilityBinding[];
  readonly aiResult: NormalizedAiResult;
  readonly planId: string;
  readonly workflowId: string;
}

export class LocalReferenceCapabilityExecution implements CapabilityInvocationPort {
  public constructor(
    private readonly resolver: CapabilityResolver,
    private readonly ai: AiProviderFramework,
    private readonly toolLoop?: ToolLoopDeps,
    private readonly routing?: AiRoutingDeps,
  ) {}

  public async invoke(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): Promise<LocalCapabilityExecutionOutput> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context);
    const aiResult =
      this.toolLoop === undefined
        ? await this.#executePlain(prepared.binding, prepared.baseRequest, context, prepared.objective, signal)
        : await runAiToolLoop(
            this.toolLoop,
            prepared.binding,
            context,
            prepared.objective,
            signal,
            control,
            this.routing,
            prepared.baseRequest,
          );
    return Object.freeze({
      bindings: Object.freeze([prepared.binding]),
      aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: prepared.workflowId,
    });
  }

  public async *stream(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): AsyncIterable<CapabilityStreamEvent> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context);
    if (this.toolLoop === undefined) {
      yield* this.#streamPlain(prepared.binding, prepared.baseRequest, context, prepared.objective, signal, prepared.workflowId);
      return;
    }
    yield* streamAiWithOptionalTools(
      this.toolLoop,
      prepared.binding,
      context,
      prepared.objective,
      signal,
      control,
      prepared.workflowId,
      this.routing,
      prepared.baseRequest,
    );
  }

  async #executePlain(
    binding: CapabilityBinding,
    baseRequest: CapabilityRequest,
    context: ExecutionContext,
    objective: string,
    signal: AbortSignal,
  ): Promise<NormalizedAiResult> {
    if (this.routing === undefined) {
      return this.ai.execute(plainRequest(binding, context, objective, signal, false));
    }
    const routed = await executeAiWithRouting(
      this.routing,
      baseRequest,
      binding,
      (next) => plainRequest(next, context, objective, signal, false),
      { allowFallback: true },
    );
    return routed.result;
  }

  async *#streamPlain(
    binding: CapabilityBinding,
    baseRequest: CapabilityRequest,
    context: ExecutionContext,
    objective: string,
    signal: AbortSignal,
    workflowId: string,
  ): AsyncIterable<CapabilityStreamEvent> {
    if (this.routing === undefined) {
      yield* streamPlainAi(this.ai, binding, context, objective, signal, workflowId);
      return;
    }
    let sequence = 0;
    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
    let diagnosticId = `ai:${context.executionId}`;
    let activeBinding = binding;
    let sawTerminal = false;

    for await (const item of streamAiWithRouting(
      this.routing,
      baseRequest,
      binding,
      (next) => plainRequest(next, context, objective, signal, true),
      { allowFallback: true },
    )) {
      activeBinding = item.binding;
      const event = item.event;
      switch (event.type) {
        case 'content':
          if (event.part.type === 'text') {
            text += event.part.text;
            yield {
              type: 'delta',
              sequence: sequence++,
              payload: Object.freeze({ kind: 'text' as const, text: event.part.text }),
            };
          }
          break;
        case 'usage':
          usage = { ...event.usage };
          yield { type: 'usage', sequence: sequence++, usage: Object.freeze({ ...event.usage }) };
          break;
        case 'completed':
          finishReason = event.finishReason;
          diagnosticId = event.diagnosticId;
          sawTerminal = true;
          break;
        case 'failed':
          sawTerminal = true;
          throw Object.assign(new Error(event.message), { code: event.code, retryable: event.retryable });
        case 'cancelled':
          sawTerminal = true;
          throw new TypeError('Capability execution aborted');
        case 'tool-call':
          throw new TypeError('Tool calling requires TOOLS_ENABLED=true');
      }
    }
    if (!sawTerminal) throw new TypeError('AI stream ended without terminal event');
    yield {
      type: 'final',
      sequence: sequence++,
      result: Object.freeze({
        bindings: Object.freeze([activeBinding]),
        aiResult: Object.freeze({
          requestId: `${context.executionId}:${activeBinding.bindingId}`,
          content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
          usage: Object.freeze(usage),
          model: Object.freeze({
            id: activeBinding.implementationId,
            capabilities: Object.freeze([activeBinding.capability]),
          }),
          finishReason,
          toolCalls: Object.freeze([]),
          diagnosticId,
          metadata: Object.freeze({ source: 'local-reference', mode: 'stream' }),
        }),
        planId: `plan:${context.executionId}`,
        workflowId,
      }),
    };
  }

  async #prepare(
    work: unknown,
    context: ExecutionContext,
  ): Promise<
    Readonly<{
      binding: CapabilityBinding;
      baseRequest: CapabilityRequest;
      objective: string;
      workflowId: string;
    }>
  > {
    const nodes = extractNodes(work);
    const objective = context.attributes['objective'] ?? '';
    const node = nodes.find((item) => item.capability !== undefined);
    if (node === undefined || node.capability === undefined) {
      throw new TypeError('No capability binding resolved');
    }
    const baseRequest = textGenerationRequest(context, node.capability, node.nodeId);
    const binding = await this.resolver.resolve(baseRequest);
    const snapshot = extractSnapshot(work);
    return Object.freeze({ binding, baseRequest, objective, workflowId: snapshot.workflowId });
  }
}

async function* streamPlainAi(
  ai: AiProviderFramework,
  binding: CapabilityBinding,
  context: ExecutionContext,
  objective: string,
  signal: AbortSignal,
  workflowId: string,
): AsyncIterable<CapabilityStreamEvent> {
  const request = plainRequest(binding, context, objective, signal, true);
  let sequence = 0;
  let text = '';
  let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
  let diagnosticId = `ai:${request.requestId}`;
  let sawTerminal = false;

  for await (const event of ai.stream(request)) {
    switch (event.type) {
      case 'content': {
        if (event.part.type === 'text') {
          text += event.part.text;
          yield {
            type: 'delta',
            sequence: sequence++,
            payload: Object.freeze({ kind: 'text' as const, text: event.part.text }),
          };
        }
        break;
      }
      case 'usage': {
        usage = { ...event.usage };
        yield { type: 'usage', sequence: sequence++, usage: Object.freeze({ ...event.usage }) };
        break;
      }
      case 'completed': {
        finishReason = event.finishReason;
        diagnosticId = event.diagnosticId;
        sawTerminal = true;
        break;
      }
      case 'failed': {
        sawTerminal = true;
        throw Object.assign(new Error(event.message), { code: event.code, retryable: event.retryable });
      }
      case 'cancelled': {
        sawTerminal = true;
        throw new TypeError('Capability execution aborted');
      }
      case 'tool-call': {
        throw new TypeError('Tool calling requires TOOLS_ENABLED=true');
      }
    }
  }

  if (!sawTerminal) throw new TypeError('AI stream ended without terminal event');

  yield {
    type: 'final',
    sequence: sequence++,
    result: Object.freeze({
      bindings: Object.freeze([binding]),
      aiResult: Object.freeze({
        requestId: request.requestId,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
        usage: Object.freeze(usage),
        model: Object.freeze({
          id: binding.implementationId,
          capabilities: Object.freeze([binding.capability]),
        }),
        finishReason,
        toolCalls: Object.freeze([]),
        diagnosticId,
        metadata: Object.freeze({ source: 'local-reference', mode: 'stream' }),
      }),
      planId: `plan:${context.executionId}`,
      workflowId,
    }),
  };
}

function plainRequest(
  binding: CapabilityBinding,
  context: ExecutionContext,
  objective: string,
  signal: AbortSignal,
  streaming: boolean,
): Parameters<AiProviderFramework['execute']>[0] {
  return Object.freeze({
    requestId: `${context.executionId}:${binding.bindingId}`,
    binding,
    context,
    messages: Object.freeze([
      Object.freeze({
        role: 'user' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: objective })]),
      }),
    ]),
    generation: Object.freeze({ maximumOutputTokens: 128 }),
    ...(streaming ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) } : {}),
    metadata: Object.freeze({ source: 'local-reference' }),
    constraints: Object.freeze({}),
    signal,
  });
}

function extractNodes(work: unknown): readonly NodeExecutionContract[] {
  if (typeof work !== 'object' || work === null || !('eligible' in work) || !Array.isArray(work.eligible)) {
    throw new TypeError('Runtime work has no eligible node contracts');
  }
  return work.eligible as readonly NodeExecutionContract[];
}

function extractSnapshot(work: unknown): { readonly workflowId: string } {
  if (typeof work !== 'object' || work === null || !('snapshot' in work)) {
    throw new TypeError('Runtime work has no workflow snapshot');
  }
  const snapshot = (work as { snapshot: { workflowId: string } }).snapshot;
  return Object.freeze({ workflowId: snapshot.workflowId });
}
