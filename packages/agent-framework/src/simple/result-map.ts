import { SimpleAgentError } from './errors.js';
import type { AgentMemoryDiagnostics, AgentResult, AgentUsage } from './types.js';

interface NormalizedAiLike {
  readonly content?: readonly { readonly type: string; readonly text?: string }[];
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
}

interface CapabilityOutputLike {
  readonly aiResult?: NormalizedAiLike;
  readonly memory?: AgentMemoryDiagnostics;
}

export function mapRuntimeResultToAgentResult(runtimeResult: unknown): AgentResult {
  if (typeof runtimeResult !== 'object' || runtimeResult === null) {
    throw new SimpleAgentError(
      'AGENT_INVOKE_FAILED',
      'Agent invocation completed without a usable Runtime result.',
    );
  }

  const record = runtimeResult as {
    readonly executionId?: unknown;
    readonly state?: unknown;
    readonly output?: unknown;
  };

  if (record.state !== 'completed' || typeof record.executionId !== 'string') {
    throw new SimpleAgentError(
      'AGENT_INVOKE_FAILED',
      'Agent invocation did not complete successfully.',
      typeof record.executionId === 'string' ? record.executionId : undefined,
    );
  }

  const output = record.output as CapabilityOutputLike | undefined;
  const aiResult = output?.aiResult;
  const text = extractText(aiResult);
  if (text === undefined) {
    throw new SimpleAgentError(
      'AGENT_INVOKE_FAILED',
      'Agent invocation completed but no text content was returned.',
      record.executionId,
    );
  }

  const usage = mapUsage(aiResult?.usage);
  const memory = normalizeMemoryDiagnostics(output?.memory);
  return Object.freeze({
    text,
    output: record.output,
    executionId: record.executionId,
    ...(usage === undefined ? {} : { usage }),
    metadata: Object.freeze({
      mode: 'simple' as const,
      ...(memory === undefined ? {} : { memory }),
    }),
    raw: runtimeResult,
  });
}

function normalizeMemoryDiagnostics(value: unknown): AgentMemoryDiagnostics | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Partial<AgentMemoryDiagnostics>;
  if (record.enabled !== true) return undefined;
  if (typeof record.retrievedItemCount !== 'number' || !Number.isFinite(record.retrievedItemCount)) {
    return undefined;
  }
  if (typeof record.injected !== 'boolean') return undefined;
  if (typeof record.injectedPreview !== 'string') return undefined;
  return Object.freeze({
    enabled: true as const,
    retrievedItemCount: record.retrievedItemCount,
    injected: record.injected,
    injectedPreview: record.injectedPreview,
  });
}

function extractText(aiResult: NormalizedAiLike | undefined): string | undefined {
  if (aiResult?.content === undefined) return undefined;
  const parts = aiResult.content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '');
  if (parts.length === 0) return undefined;
  return parts.join('');
}

function mapUsage(usage: NormalizedAiLike['usage']): AgentUsage | undefined {
  if (usage === undefined) return undefined;
  return Object.freeze({
    ...(usage.inputTokens === undefined ? {} : { inputTokens: usage.inputTokens }),
    ...(usage.outputTokens === undefined ? {} : { outputTokens: usage.outputTokens }),
    ...(usage.totalTokens === undefined ? {} : { totalTokens: usage.totalTokens }),
  });
}
