import type { CapabilityBinding, CapabilityResolver } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type {
  AiProviderFramework,
  NormalizedAiResult,
} from '@agentprodready/ai-provider';
import type {
  CapabilityExecutionControl,
  CapabilityInvocationPort,
  CapabilityStreamEvent,
} from '@agentprodready/runtime';
import type { NodeExecutionContract } from '@agentprodready/workflow';
import type { EmbeddedPromptService } from './embedded-prompt.js';

export interface EmbeddedCapabilityOutput {
  readonly bindings: readonly CapabilityBinding[];
  readonly aiResult: NormalizedAiResult;
  readonly planId: string;
  readonly workflowId: string;
  readonly promptPackageId: string;
}

export class EmbeddedCapabilityExecution implements CapabilityInvocationPort {
  public constructor(
    private readonly resolver: CapabilityResolver,
    private readonly ai: AiProviderFramework,
    private readonly prompts: EmbeddedPromptService,
    private readonly instructions: string,
    private readonly tenantId: string,
    private readonly workspaceId: string,
  ) {}

  public async invoke(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    _control?: CapabilityExecutionControl,
  ): Promise<EmbeddedCapabilityOutput> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context, signal);
    const aiResult = await this.ai.execute(prepared.request);
    return Object.freeze({
      bindings: Object.freeze([prepared.binding]),
      aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: prepared.workflowId,
      promptPackageId: prepared.promptPackageId,
    });
  }

  public async *stream(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    _control?: CapabilityExecutionControl,
  ): AsyncIterable<CapabilityStreamEvent> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context, signal, true);
    let sequence = 0;
    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
    let diagnosticId = `ai:${prepared.request.requestId}`;
    let sawTerminal = false;

    for await (const event of this.ai.stream(prepared.request)) {
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
          throw new TypeError('Tool calling is not supported in the simple Agent API');
        }
      }
    }

    if (!sawTerminal) throw new TypeError('AI stream ended without terminal event');

    yield {
      type: 'final',
      sequence: sequence++,
      result: Object.freeze({
        bindings: Object.freeze([prepared.binding]),
        aiResult: Object.freeze({
          requestId: prepared.request.requestId,
          content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
          usage: Object.freeze(usage),
          model: Object.freeze({
            id: prepared.binding.implementationId,
            capabilities: Object.freeze([prepared.binding.capability]),
          }),
          finishReason,
          toolCalls: Object.freeze([]),
          diagnosticId,
          metadata: Object.freeze({ source: 'simple-facade', mode: 'stream' }),
        }),
        planId: `plan:${context.executionId}`,
        workflowId: prepared.workflowId,
        promptPackageId: prepared.promptPackageId,
      }),
    };
  }

  async #prepare(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    streaming = false,
  ): Promise<{
    readonly binding: CapabilityBinding;
    readonly request: Parameters<AiProviderFramework['execute']>[0];
    readonly workflowId: string;
    readonly promptPackageId: string;
  }> {
    const nodes = extractNodes(work);
    const objective = context.attributes['objective'] ?? '';
    const node = nodes.find((item) => item.capability !== undefined);
    if (node === undefined || node.capability === undefined) {
      throw new TypeError('No capability binding resolved');
    }
    const snapshot = extractSnapshot(work);
    const binding = await this.resolver.resolve({
      requestId: `${context.executionId}:${node.nodeId}`,
      capability: node.capability,
      contractVersion: '1',
      context,
      node,
      constraints: Object.freeze({}),
    });

    const promptPackage = await this.prompts.build({
      instructions: this.instructions,
      userInput: objective,
      executionId: context.executionId,
      correlationId: context.correlationId,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
    });

    const request = Object.freeze({
      requestId: `${context.executionId}:${binding.bindingId}`,
      binding,
      context,
      messages: Object.freeze([
        Object.freeze({
          role: 'system' as const,
          content: Object.freeze([
            Object.freeze({ type: 'text' as const, text: promptPackage.canonical }),
          ]),
        }),
        Object.freeze({
          role: 'user' as const,
          content: Object.freeze([Object.freeze({ type: 'text' as const, text: objective })]),
        }),
      ]),
      generation: Object.freeze({ maximumOutputTokens: 512 }),
      ...(streaming ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) } : {}),
      metadata: Object.freeze({ source: 'simple-facade', promptPackageId: promptPackage.id }),
      constraints: Object.freeze({}),
      signal,
    });

    return Object.freeze({
      binding,
      request,
      workflowId: snapshot.workflowId,
      promptPackageId: promptPackage.id,
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
