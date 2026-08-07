import type { HealthResult } from '@agentprodready/foundation';
import type {
  AiAdapterResolver,
  AiDiagnostics,
  AiDiagnostic,
  AiExecutionRequest,
  AiFact,
  AiEventPublisher,
  AiProviderAdapter,
  AiTelemetry,
  AiUsage,
  NormalizedAiResult,
  NormalizedAiStreamEvent,
  NormalizedToolCall,
} from '../contracts/ai.js';

interface ReferenceVendorRequest {
  readonly transcript: string;
  readonly tokenLimit: number;
}
interface ReferenceVendorResponse {
  readonly answer: string;
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly stopCode: 'done' | 'tool-calls';
  readonly toolCalls: readonly NormalizedToolCall[];
}

/** Split text into whitespace-preserving deterministic chunks (not model tokens). */
export function referenceStreamChunks(text: string): readonly string[] {
  if (text.length === 0) return Object.freeze(['']);
  const chunks: string[] = [];
  const pattern = /(\s+|\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    chunks.push(match[0]);
  }
  return Object.freeze(chunks.length === 0 ? [''] : chunks);
}

function lastUserText(request: AiExecutionRequest): string {
  for (let index = request.messages.length - 1; index >= 0; index -= 1) {
    const message = request.messages[index];
    if (message?.role === 'user') {
      return message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
    }
  }
  return request.messages
    .flatMap((message) => message.content.filter((part) => part.type === 'text').map((part) => part.text))
    .join('\n');
}

function hasToolResults(request: AiExecutionRequest): boolean {
  return request.messages.some((message) => message.role === 'tool');
}

function resolveToolCalls(request: AiExecutionRequest, transcript: string): readonly NormalizedToolCall[] {
  if (request.tools === undefined || request.tools.length === 0) return Object.freeze([]);
  if (hasToolResults(request)) return Object.freeze([]);

  const echoMatch = /USE_TOOL_ECHO:\s*(.+)$/u.exec(transcript.trim());
  if (echoMatch !== null && request.tools.some((tool) => tool.name === 'reference.echo')) {
    return Object.freeze([
      Object.freeze({
        id: 'call-echo-1',
        name: 'reference.echo',
        arguments: Object.freeze({ message: echoMatch[1]?.trim() ?? '' }),
      }),
    ]);
  }

  if (/USE_TOOL_COUNTER\b/u.test(transcript) && request.tools.some((tool) => tool.name === 'reference.counter')) {
    return Object.freeze([
      Object.freeze({
        id: 'call-counter-1',
        name: 'reference.counter',
        arguments: Object.freeze({}),
      }),
    ]);
  }

  return Object.freeze([]);
}

function continuationAnswer(request: AiExecutionRequest): string | undefined {
  if (!hasToolResults(request)) return undefined;
  const toolMessage = [...request.messages].reverse().find((message) => message.role === 'tool');
  if (toolMessage === undefined) return 'Tool returned:';
  const text = toolMessage.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
  try {
    const parsed = JSON.parse(text) as { message?: string; value?: number };
    if (typeof parsed.message === 'string') return `Tool returned: ${parsed.message}`;
    if (typeof parsed.value === 'number') return `Tool returned: ${String(parsed.value)}`;
  } catch {
    // fall through
  }
  return `Tool returned: ${text}`;
}

export class ReferenceAiProviderAdapter implements AiProviderAdapter {
  public readonly id = 'reference-ai';

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    const transcript = lastUserText(request);
    const continued = continuationAnswer(request);
    const toolCalls = resolveToolCalls(request, transcript);
    const vendorRequest: ReferenceVendorRequest = {
      transcript,
      tokenLimit: request.generation.maximumOutputTokens ?? 128,
    };
    const answer = continued ?? (toolCalls.length > 0 ? '' : vendorRequest.transcript);
    const response: ReferenceVendorResponse = {
      answer,
      inputUnits: vendorRequest.transcript.length,
      outputUnits: Math.min(Math.max(answer.length, 1), vendorRequest.tokenLimit),
      stopCode: toolCalls.length > 0 ? 'tool-calls' : 'done',
      toolCalls,
    };
    const usage = {
      inputTokens: response.inputUnits,
      outputTokens: response.outputUnits,
      totalTokens: response.inputUnits + response.outputUnits,
    };
    return {
      requestId: request.requestId,
      content: [{ type: 'text', text: response.answer }],
      usage,
      model: { id: 'reference-model', capabilities: [request.binding.capability] },
      finishReason: toolCalls.length > 0 ? 'tool-calls' : 'completed',
      structuredOutput: request.structuredOutput === undefined ? undefined : { echo: response.answer },
      toolCalls: [...toolCalls],
      diagnosticId: `ai:${request.requestId}`,
      metadata: { adapter: 'reference' },
    };
  }

  public async *stream(request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    const diagnosticId = `ai:${request.requestId}`;
    let sequence = 0;
    const transcript = lastUserText(request);
    const continued = continuationAnswer(request);
    const toolCalls = resolveToolCalls(request, transcript);

    if (toolCalls.length > 0) {
      for (const call of toolCalls) {
        if (request.signal?.aborted === true) {
          yield { type: 'cancelled', sequence, diagnosticId };
          return;
        }
        yield { type: 'tool-call', sequence: sequence++, call };
      }
      yield { type: 'completed', sequence, finishReason: 'tool-calls', diagnosticId };
      return;
    }

    const text = continued ?? transcript;
    const chunks = referenceStreamChunks(text);

    for (const chunk of chunks) {
      if (request.signal?.aborted === true) {
        yield { type: 'cancelled', sequence, diagnosticId };
        return;
      }
      yield { type: 'content', sequence: sequence++, part: { type: 'text', text: chunk } };
    }

    if (request.signal?.aborted === true) {
      yield { type: 'cancelled', sequence, diagnosticId };
      return;
    }

    const usage = {
      inputTokens: 1,
      outputTokens: chunks.length,
      totalTokens: 1 + chunks.length,
    };
    if (request.streaming?.includeUsage === true) {
      yield { type: 'usage', sequence: sequence++, usage };
    }
    yield { type: 'completed', sequence, finishReason: 'completed', diagnosticId };
  }

  public async health(): Promise<HealthResult> {
    return { name: this.id, status: 'healthy' };
  }
}

export class FactoryAiAdapterResolver implements AiAdapterResolver {
  readonly #factories = new Map<string, () => Promise<AiProviderAdapter>>();
  public bind(implementationId: string, factory: () => Promise<AiProviderAdapter>): void {
    this.#factories.set(implementationId, factory);
  }
  public async resolve(binding: AiExecutionRequest['binding']): Promise<AiProviderAdapter> {
    const factory = this.#factories.get(binding.implementationId);
    if (factory === undefined) throw new TypeError(`No Composition adapter binding: ${binding.implementationId}`);
    return await factory();
  }
}

export class InMemoryAiDiagnostics implements AiDiagnostics {
  readonly #items = new Map<string, AiDiagnostic>();
  public record(value: AiDiagnostic): void {
    this.#items.set(value.id, value);
  }
  public get(id: string): AiDiagnostic | undefined {
    return this.#items.get(id);
  }
  public list(): readonly AiDiagnostic[] {
    return Object.freeze([...this.#items.values()]);
  }
}

export class InMemoryAiEvents implements AiEventPublisher {
  readonly facts: AiFact[] = [];
  public async publish(value: AiFact): Promise<void> {
    this.facts.push(value);
  }
}

export class NoopAiTelemetry implements AiTelemetry {
  public completed(_id: string, _duration: number, _usage: AiUsage): void {}
  public failed(_id: string, _code: Parameters<AiTelemetry['failed']>[1], _duration: number): void {}
  public streamed(_id: string, _count: number): void {}
}
