import type { HealthResult } from '@agentforge/foundation';
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
} from '../contracts/ai.js';

interface ReferenceVendorRequest {
  readonly transcript: string;
  readonly tokenLimit: number;
}
interface ReferenceVendorResponse {
  readonly answer: string;
  readonly inputUnits: number;
  readonly outputUnits: number;
  readonly stopCode: 'done';
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

export class ReferenceAiProviderAdapter implements AiProviderAdapter {
  public readonly id = 'reference-ai';

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    const vendorRequest: ReferenceVendorRequest = {
      transcript: request.messages
        .flatMap((message) => message.content.filter((part) => part.type === 'text').map((part) => part.text))
        .join('\n'),
      tokenLimit: request.generation.maximumOutputTokens ?? 128,
    };
    const response: ReferenceVendorResponse = {
      answer: vendorRequest.transcript,
      inputUnits: vendorRequest.transcript.length,
      outputUnits: Math.min(vendorRequest.transcript.length, vendorRequest.tokenLimit),
      stopCode: 'done',
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
      finishReason: 'completed',
      structuredOutput: request.structuredOutput === undefined ? undefined : { echo: response.answer },
      toolCalls: (request.tools ?? []).slice(0, 1).map((tool) => ({ id: 'call-1', name: tool.name, arguments: {} })),
      diagnosticId: `ai:${request.requestId}`,
      metadata: { adapter: 'reference' },
    };
  }

  public async *stream(request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    const diagnosticId = `ai:${request.requestId}`;
    let sequence = 0;
    const text = request.messages
      .flatMap((message) => message.content.filter((part) => part.type === 'text').map((part) => part.text))
      .join('\n');
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
