import type { AiExecutionRequest, AiFinishReason, NormalizedAiStreamEvent, NormalizedToolCall } from '@agentprodready/ai-provider';
import { ProviderAdapterError } from '@agentprodready/ai-provider';

/** Internal vendor stream chunk shape — never exported from package index. */
export interface GeminiGenerateContentChunk {
  readonly candidates?: readonly {
    readonly finishReason?: string | null;
    readonly content?: {
      readonly parts?: readonly {
        readonly text?: string;
        readonly functionCall?: {
          readonly name?: string;
          readonly args?: unknown;
        };
      }[];
    };
  }[];
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
}

type AssembledCall = {
  name: string;
  argsText: string;
  args?: Readonly<Record<string, unknown>>;
};

export async function* translateGeminiStream(
  request: AiExecutionRequest,
  chunks: AsyncIterable<GeminiGenerateContentChunk>,
): AsyncIterable<NormalizedAiStreamEvent> {
  const diagnosticId = `ai:${request.requestId}`;
  let sequence = 0;
  let finishReason: AiFinishReason = 'unknown';
  const assemblies = new Map<number, AssembledCall>();
  const emitted = new Set<string>();
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    for await (const chunk of chunks) {
      if (request.signal?.aborted === true) {
        yield { type: 'cancelled', sequence, diagnosticId };
        return;
      }

      const candidate = chunk.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      for (const [index, part] of parts.entries()) {
        if (typeof part.text === 'string' && part.text.length > 0) {
          yield {
            type: 'content',
            sequence: sequence++,
            part: Object.freeze({ type: 'text' as const, text: part.text }),
          };
        }

        const fn = part.functionCall;
        if (fn !== undefined) {
          const name = fn.name?.trim() ?? '';
          const args = fn.args;
          if (name !== '') {
            if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
              const id = `gemini-${name}-${String(index)}`;
              if (!emitted.has(id)) {
                emitted.add(id);
                yield {
                  type: 'tool-call',
                  sequence: sequence++,
                  call: Object.freeze({
                    id,
                    name,
                    arguments: Object.freeze({ ...(args as Record<string, unknown>) }),
                  }),
                };
              }
            } else {
              assemblies.set(index, {
                name,
                argsText: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
              });
            }
          }
        }
      }

      if (candidate?.finishReason !== undefined && candidate.finishReason !== null) {
        finishReason = mapFinishReason(candidate.finishReason, emitted.size > 0);
      }

      if (chunk.usageMetadata !== undefined) {
        inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
        outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
        if (request.streaming?.includeUsage === true) {
          const totalTokens = chunk.usageMetadata.totalTokenCount ?? inputTokens + outputTokens;
          yield {
            type: 'usage',
            sequence: sequence++,
            usage: Object.freeze({ inputTokens, outputTokens, totalTokens }),
          };
        }
      }
    }

    for (const [index, assembly] of [...assemblies.entries()].sort((a, b) => a[0] - b[0])) {
      const complete = tryComplete(assembly, index);
      if (complete !== undefined && !emitted.has(complete.id)) {
        emitted.add(complete.id);
        yield { type: 'tool-call', sequence: sequence++, call: complete };
      }
    }

    if (emitted.size > 0 && finishReason === 'unknown') {
      finishReason = 'tool-calls';
    }

    yield { type: 'completed', sequence, finishReason, diagnosticId };
  } catch (error) {
    if (error instanceof ProviderAdapterError) {
      yield {
        type: 'failed',
        sequence,
        code: mapCode(error.kind),
        message: error.message,
        diagnosticId,
        retryable: error.retryable,
      };
      return;
    }
    throw error;
  }
}

function tryComplete(assembly: AssembledCall, index: number): NormalizedToolCall | undefined {
  if (assembly.name.trim() === '') return undefined;
  let parsed: unknown;
  try {
    parsed = assembly.argsText.trim() === '' ? {} : JSON.parse(assembly.argsText);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
  return Object.freeze({
    id: `gemini-${assembly.name}-${String(index)}`,
    name: assembly.name,
    arguments: Object.freeze({ ...(parsed as Record<string, unknown>) }),
  });
}

function mapFinishReason(reason: string | null | undefined, hasTools: boolean): AiFinishReason {
  switch (reason) {
    case 'STOP':
      return hasTools ? 'tool-calls' : 'completed';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
      return 'content-filtered';
    case 'RECITATION':
    case 'STOP_SEQUENCE':
      return 'stopped';
    case 'MALFORMED_FUNCTION_CALL':
      return 'tool-calls';
    default:
      return hasTools ? 'tool-calls' : 'unknown';
  }
}

function mapCode(
  kind: ProviderAdapterError['kind'],
): 'AI_AUTHENTICATION' | 'AI_RATE_LIMITED' | 'AI_CONTEXT_LIMIT' | 'AI_INVALID_REQUEST' | 'AI_UNAVAILABLE' | 'AI_PROVIDER_TIMEOUT' | 'AI_UNKNOWN' {
  switch (kind) {
    case 'authentication':
      return 'AI_AUTHENTICATION';
    case 'rate-limit':
      return 'AI_RATE_LIMITED';
    case 'context-limit':
      return 'AI_CONTEXT_LIMIT';
    case 'invalid-request':
      return 'AI_INVALID_REQUEST';
    case 'unavailable':
      return 'AI_UNAVAILABLE';
    case 'timeout':
      return 'AI_PROVIDER_TIMEOUT';
    default:
      return 'AI_UNKNOWN';
  }
}
