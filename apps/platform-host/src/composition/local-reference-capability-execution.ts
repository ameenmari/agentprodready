import type { ExecutionContext } from '@agentforge/foundation';
import type { CapabilityBinding, CapabilityRequest, CapabilityResolver } from '@agentforge/capability-resolution';
import type { CapabilityInvocationPort, CapabilityStreamEvent } from '@agentforge/runtime';
import type { NodeExecutionContract } from '@agentforge/workflow';
import type { AiExecutionRequest, AiProviderFramework, NormalizedAiResult } from '@agentforge/ai-provider';

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
  ) {}

  public async invoke(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
  ): Promise<LocalCapabilityExecutionOutput> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context);
    const aiResult = await this.ai.execute(this.#aiRequest(prepared.binding, context, prepared.objective, signal, false));
    return Object.freeze({
      bindings: prepared.bindings,
      aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: prepared.workflowId,
    });
  }

  public async *stream(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
  ): AsyncIterable<CapabilityStreamEvent> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context);
    const request = this.#aiRequest(prepared.binding, context, prepared.objective, signal, true);
    let sequence = 0;
    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
    let diagnosticId = `ai:${request.requestId}`;
    let sawTerminal = false;

    for await (const event of this.ai.stream(request)) {
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
          throw new TypeError('Tool calling is not supported in v0.8 streaming');
        }
      }
    }

    if (!sawTerminal) {
      throw new TypeError('AI stream ended without terminal event');
    }

    const aiResult: NormalizedAiResult = Object.freeze({
      requestId: request.requestId,
      content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
      usage: Object.freeze(usage),
      model: Object.freeze({
        id: prepared.binding.implementationId,
        capabilities: Object.freeze([prepared.binding.capability]),
      }),
      finishReason,
      toolCalls: Object.freeze([]),
      diagnosticId,
      metadata: Object.freeze({ source: 'local-reference', mode: 'stream' }),
    });

    const final: LocalCapabilityExecutionOutput = Object.freeze({
      bindings: prepared.bindings,
      aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: prepared.workflowId,
    });

    yield { type: 'final', sequence: sequence++, result: final };
  }

  async #prepare(
    work: unknown,
    context: ExecutionContext,
  ): Promise<
    Readonly<{
      bindings: readonly CapabilityBinding[];
      binding: CapabilityBinding;
      objective: string;
      workflowId: string;
    }>
  > {
    const nodes = extractNodes(work);
    const objective = context.attributes['objective'] ?? '';
    const bindings = await Promise.all(
      nodes
        .filter((node) => node.capability !== undefined)
        .map((node, index) =>
          this.resolver.resolve(
            Object.freeze({
              requestId: `${context.executionId}:${node.nodeId}:${String(index)}`,
              capability: node.capability ?? '',
              context,
              node,
              constraints: Object.freeze({}),
            } satisfies CapabilityRequest),
          ),
        ),
    );
    const binding = bindings[0];
    if (binding === undefined) throw new TypeError('No capability binding resolved');
    const snapshot = extractSnapshot(work);
    return Object.freeze({ bindings, binding, objective, workflowId: snapshot.workflowId });
  }

  #aiRequest(
    binding: CapabilityBinding,
    context: ExecutionContext,
    objective: string,
    signal: AbortSignal,
    streaming: boolean,
  ): AiExecutionRequest {
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
      ...(streaming
        ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) }
        : {}),
      metadata: Object.freeze({ source: 'local-reference' }),
      constraints: Object.freeze({}),
      signal,
    });
  }
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
