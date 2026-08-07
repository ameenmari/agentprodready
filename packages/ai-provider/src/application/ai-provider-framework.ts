import type { HealthResult } from '@agentforge/foundation';
import type {
  AiAdapterResolver,
  AiDiagnostic,
  AiDiagnostics,
  AiErrorCode,
  AiEventPublisher,
  AiExecutionRequest,
  AiFact,
  AiProviderAdapter,
  AiTelemetry,
  NormalizedAiResult,
  NormalizedAiStreamEvent,
} from '../contracts/ai.js';
import { NormalizedAiError, ProviderAdapterError } from '../errors/ai-error.js';

const TERMINAL_TYPES = new Set(['completed', 'failed', 'cancelled']);

export class AiProviderFramework {
  public constructor(
    private readonly adapters: AiAdapterResolver,
    private readonly diagnostics: AiDiagnostics,
    private readonly events: AiEventPublisher,
    private readonly telemetry: AiTelemetry,
  ) {}

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    validateRequest(request, false);
    const started = Date.now();
    const adapter = await this.adapters.resolve(request.binding);
    const diagnosticId = `ai:${request.requestId}`;
    try {
      const result = validateResult(await adapter.execute(deepFreeze(copyRequest(request))), request, diagnosticId);
      this.diagnostics.record(
        deepFreeze({
          id: diagnosticId,
          requestId: request.requestId,
          adapterId: adapter.id,
          outcome: 'completed',
          finishReason: result.finishReason,
        }),
      );
      await this.#publish('ai.completed', request, diagnosticId);
      this.telemetry.completed(adapter.id, Date.now() - started, result.usage);
      return result;
    } catch (error) {
      throw await this.#normalizeFailure(error, request, adapter, diagnosticId, started);
    }
  }

  public async *stream(request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    validateRequest(request, true);
    const started = Date.now();
    const adapter = await this.adapters.resolve(request.binding);
    const diagnosticId = `ai:${request.requestId}`;
    let sequence = 0;
    let count = 0;
    let terminalSeen = false;
    try {
      for await (const event of adapter.stream(deepFreeze(copyRequest(request)))) {
        if (event.sequence !== sequence) {
          throw new ProviderAdapterError('invalid-request', 'Non-contiguous stream sequence', false);
        }
        sequence++;
        count++;
        const frozen = deepFreeze(copyEvent(event));
        yield frozen;
        if (TERMINAL_TYPES.has(event.type)) {
          terminalSeen = true;
          if (event.type === 'completed') {
            this.diagnostics.record(
              deepFreeze({
                id: diagnosticId,
                requestId: request.requestId,
                adapterId: adapter.id,
                outcome: 'completed',
              }),
            );
            await this.#publish('ai.stream.completed', request, diagnosticId);
            this.telemetry.streamed(adapter.id, count);
          } else if (event.type === 'failed') {
            this.diagnostics.record(
              deepFreeze({
                id: diagnosticId,
                requestId: request.requestId,
                adapterId: adapter.id,
                outcome: 'failed',
                errorCode: event.code,
              }),
            );
            await this.#publish('ai.stream.failed', request, diagnosticId);
            this.telemetry.failed(adapter.id, event.code, Date.now() - started);
          } else if (event.type === 'cancelled') {
            this.diagnostics.record(
              deepFreeze({
                id: diagnosticId,
                requestId: request.requestId,
                adapterId: adapter.id,
                outcome: 'failed',
                errorCode: 'AI_UNKNOWN',
              }),
            );
            await this.#publish('ai.stream.cancelled', request, diagnosticId);
            this.telemetry.streamed(adapter.id, count);
          }
          return;
        }
      }
      throw new ProviderAdapterError('invalid-request', 'Stream ended without terminal event', false);
    } catch (error) {
      if (terminalSeen) {
        // Single-terminal rule: never throw after emitting a terminal event.
        return;
      }
      let code: AiErrorCode = 'AI_UNKNOWN';
      let message = 'AI provider interaction failed';
      let retryable = false;
      if (error instanceof NormalizedAiError) {
        code = error.code;
        message = error.message;
        retryable = error.retryable;
      } else if (error instanceof ProviderAdapterError) {
        code = errorCode(error.kind);
        message = error.message;
        retryable = error.retryable;
      }
      this.diagnostics.record(
        deepFreeze({
          id: diagnosticId,
          requestId: request.requestId,
          adapterId: adapter.id,
          outcome: 'failed',
          errorCode: code,
        }),
      );
      this.telemetry.failed(adapter.id, code, Date.now() - started);
      const failed: NormalizedAiStreamEvent = deepFreeze({
        type: 'failed',
        sequence,
        code,
        message,
        diagnosticId,
        retryable,
      });
      yield failed;
      await this.#publish('ai.stream.failed', request, diagnosticId);
    }
  }

  public async health(binding: AiExecutionRequest['binding']): Promise<HealthResult> {
    return await (await this.adapters.resolve(binding)).health();
  }

  async #normalizeFailure(
    error: unknown,
    request: AiExecutionRequest,
    adapter: AiProviderAdapter,
    diagnosticId: string,
    started: number,
  ): Promise<NormalizedAiError> {
    if (error instanceof NormalizedAiError) {
      const diagnostic: AiDiagnostic = deepFreeze({
        id: diagnosticId,
        requestId: request.requestId,
        adapterId: adapter.id,
        outcome: 'failed',
        errorCode: error.code,
      });
      this.diagnostics.record(diagnostic);
      await this.#publish('ai.failed', request, diagnosticId);
      this.telemetry.failed(adapter.id, error.code, Date.now() - started);
      return error;
    }
    const failure =
      error instanceof ProviderAdapterError
        ? error
        : new ProviderAdapterError('unknown', 'AI provider interaction failed', false);
    const code = errorCode(failure.kind);
    const diagnostic: AiDiagnostic = deepFreeze({
      id: diagnosticId,
      requestId: request.requestId,
      adapterId: adapter.id,
      outcome: 'failed',
      errorCode: code,
    });
    this.diagnostics.record(diagnostic);
    await this.#publish('ai.failed', request, diagnosticId);
    this.telemetry.failed(adapter.id, code, Date.now() - started);
    return new NormalizedAiError(code, failure.message, failure.retryable, diagnosticId);
  }

  async #publish(type: AiFact['type'], request: AiExecutionRequest, diagnosticId: string): Promise<void> {
    await this.events.publish(
      Object.freeze({
        type,
        requestId: request.requestId,
        executionId: request.context.executionId,
        diagnosticId,
      }),
    );
  }
}

function validateRequest(request: AiExecutionRequest, stream: boolean): void {
  if (
    request.requestId.trim() === '' ||
    request.messages.length === 0 ||
    request.binding.bindingId.trim() === '' ||
    containsForbidden(request.constraints) ||
    containsForbidden(request.metadata)
  ) {
    throw new NormalizedAiError(
      'AI_INVALID_REQUEST',
      'Invalid normalized AI request',
      false,
      `ai:${request.requestId}`,
    );
  }
  if (stream && request.streaming?.enabled !== true) {
    throw new NormalizedAiError(
      'AI_INVALID_REQUEST',
      'Streaming must be explicitly enabled',
      false,
      `ai:${request.requestId}`,
    );
  }
  for (const message of request.messages) {
    const assistantToolCalls =
      message.role === 'assistant' && message.toolCalls !== undefined && message.toolCalls.length > 0;
    if (message.content.length === 0 && !assistantToolCalls) {
      throw new NormalizedAiError(
        'AI_INVALID_REQUEST',
        'Messages require content',
        false,
        `ai:${request.requestId}`,
      );
    }
  }
}

function validateResult(
  result: NormalizedAiResult,
  request: AiExecutionRequest,
  diagnosticId: string,
): NormalizedAiResult {
  if (
    result.requestId !== request.requestId ||
    result.usage.totalTokens !== result.usage.inputTokens + result.usage.outputTokens ||
    result.diagnosticId !== diagnosticId
  ) {
    throw new ProviderAdapterError('invalid-request', 'Adapter returned an invalid normalized result', false);
  }
  return deepFreeze(copyResult(result));
}

function errorCode(kind: ProviderAdapterError['kind']): AiErrorCode {
  return (
    {
      authentication: 'AI_AUTHENTICATION',
      'rate-limit': 'AI_RATE_LIMITED',
      'context-limit': 'AI_CONTEXT_LIMIT',
      'invalid-request': 'AI_INVALID_REQUEST',
      unavailable: 'AI_UNAVAILABLE',
      timeout: 'AI_PROVIDER_TIMEOUT',
      unknown: 'AI_UNKNOWN',
    } as const
  )[kind];
}

function containsForbidden(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).some(
    ([key, child]) => /vendor|deployment|api.?key|sdk|model.?name/iu.test(key) || containsForbidden(child),
  );
}

function copyRequest(value: AiExecutionRequest): AiExecutionRequest {
  return {
    ...value,
    messages: value.messages.map((message) => ({
      ...message,
      content: message.content.map((part) => ({ ...part })),
      ...(message.toolCalls === undefined
        ? {}
        : { toolCalls: message.toolCalls.map((call) => ({ ...call, arguments: { ...call.arguments } })) }),
    })),
    generation: {
      ...value.generation,
      ...(value.generation.stop === undefined ? {} : { stop: [...value.generation.stop] }),
    },
    ...(value.tools === undefined
      ? {}
      : { tools: value.tools.map((tool) => ({ ...tool, inputSchema: { ...tool.inputSchema } })) }),
    ...(value.structuredOutput === undefined
      ? {}
      : { structuredOutput: { ...value.structuredOutput, schema: { ...value.structuredOutput.schema } } }),
    metadata: { ...value.metadata },
    constraints: { ...value.constraints },
    ...(value.signal === undefined ? {} : { signal: value.signal }),
  };
}

function copyResult(value: NormalizedAiResult): NormalizedAiResult {
  return {
    ...value,
    content: value.content.map((part) => ({ ...part })),
    usage: { ...value.usage },
    model: { ...value.model, capabilities: [...value.model.capabilities] },
    toolCalls: value.toolCalls.map((call) => ({ ...call, arguments: { ...call.arguments } })),
    metadata: { ...value.metadata },
  };
}

function copyEvent(value: NormalizedAiStreamEvent): NormalizedAiStreamEvent {
  if (value.type === 'content') return { ...value, part: { ...value.part } };
  if (value.type === 'tool-call') return { ...value, call: { ...value.call, arguments: { ...value.call.arguments } } };
  if (value.type === 'usage') return { ...value, usage: { ...value.usage } };
  if (value.type === 'failed') return { ...value };
  if (value.type === 'cancelled') return { ...value };
  return { ...value };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
