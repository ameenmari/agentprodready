import type { ExecutionContext } from '@agentforge/foundation';
import type { CapabilityBinding, CapabilityRequest, CapabilityResolver } from '@agentforge/capability-resolution';
import type { CapabilityInvocationPort } from '@agentforge/runtime';
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

  public async invoke(work: unknown, context: ExecutionContext, signal: AbortSignal): Promise<LocalCapabilityExecutionOutput> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
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

    const aiResult = await this.ai.execute(
      Object.freeze({
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
        metadata: Object.freeze({ source: 'local-reference' }),
        constraints: Object.freeze({}),
      } satisfies AiExecutionRequest),
    );

    const snapshot = extractSnapshot(work);
    return Object.freeze({
      bindings,
      aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: snapshot.workflowId,
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
