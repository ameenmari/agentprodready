import { AgentError, freeze, type AgentInvocationRequest } from '../index.js';
import { buildEmbeddedPlatform, type EmbeddedPlatform } from './embedded-platform.js';
import { EMBEDDED_POLICY_VERSION, EMBEDDED_USER } from './embedded-security.js';
import { SimpleAgentError } from './errors.js';
import { mapRuntimeResultToAgentResult } from './result-map.js';
import { mapReplayStream, mapRuntimeStream } from './stream-map.js';
import type { Agent, AgentResult, AgentStreamEvent, CreateAgentOptions, StreamOptions } from './types.js';
import { normalizeCreateAgentOptions } from './validate-options.js';

class SimpleAgent implements Agent {
  #closed = false;
  readonly #platform: EmbeddedPlatform;

  public constructor(platform: EmbeddedPlatform) {
    this.#platform = platform;
  }

  public async invoke(input: string): Promise<AgentResult> {
    this.#ensureOpen();
    return this.#invokeObjective(normalizeInput(input));
  }

  public async *stream(input: string, _options?: StreamOptions): AsyncIterable<AgentStreamEvent> {
    this.#ensureOpen();
    const objective = normalizeInput(input);
    try {
      const correlationId = `correlation:${crypto.randomUUID()}`;
      const secured = await this.#platform.security.authorizeInvoke({
        scope: this.#platform.scope,
        agentId: this.#platform.agentId,
        agentPrincipalId: this.#platform.agentPrincipalId,
        correlationId,
      });
      const request = buildInvocationRequest({
        platform: this.#platform,
        objective,
        correlationId,
        authorization: secured.authorization,
        securityContextReference: secured.securityContextReference,
      });
      const acceptance = await this.#platform.framework.invokeStream(request);
      const executionId = acceptance.runtimeExecutionReference;
      const runtimeStream = this.#platform.runtimePort.getStream(executionId);
      if (runtimeStream === undefined) {
        throw new SimpleAgentError(
          'AGENT_STREAM_FAILED',
          'Agent stream handoff completed but no stream was available.',
          executionId,
        );
      }
      yield* mapRuntimeStream(executionId, runtimeStream);
    } catch (error) {
      throw mapStreamError(error);
    }
  }

  public async *replayStream(
    executionId: string,
    afterSequence?: number,
  ): AsyncIterable<AgentStreamEvent> {
    this.#ensureOpen();
    if (typeof executionId !== 'string' || executionId.trim() === '') {
      throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'replayStream requires a non-empty executionId.');
    }
    yield* mapReplayStream(executionId.trim(), this.#platform.streamLog, afterSequence);
  }

  public async approve(approvalId: string): Promise<void> {
    this.#ensureOpen();
    if (typeof approvalId !== 'string' || approvalId.trim() === '') {
      throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'approve requires a non-empty approvalId.');
    }
    await this.#platform.hitl.approve(approvalId.trim());
  }

  public async reject(approvalId: string, reason?: string): Promise<void> {
    this.#ensureOpen();
    if (typeof approvalId !== 'string' || approvalId.trim() === '') {
      throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'reject requires a non-empty approvalId.');
    }
    await this.#platform.hitl.reject(approvalId.trim(), reason);
  }

  public async resume(executionId: string): Promise<AgentResult> {
    this.#ensureOpen();
    if (typeof executionId !== 'string' || executionId.trim() === '') {
      throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'resume requires a non-empty executionId.');
    }
    const record = await this.#platform.hitl.requireApproved(executionId.trim());
    this.#platform.setResumeApproval({
      approvalId: record.approvalId,
      toolLoop: record.toolLoop,
      messages: record.messages,
      binding: record.binding,
    });
    try {
      return await this.#invokeObjective(record.objective);
    } finally {
      this.#platform.setResumeApproval(undefined);
    }
  }

  public async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#platform.dispose();
  }

  async #invokeObjective(objective: string): Promise<AgentResult> {
    const startedAt = Date.now();
    try {
      const correlationId = `correlation:${crypto.randomUUID()}`;
      const secured = await this.#platform.security.authorizeInvoke({
        scope: this.#platform.scope,
        agentId: this.#platform.agentId,
        agentPrincipalId: this.#platform.agentPrincipalId,
        correlationId,
      });
      const request = buildInvocationRequest({
        platform: this.#platform,
        objective,
        correlationId,
        authorization: secured.authorization,
        securityContextReference: secured.securityContextReference,
      });
      const acceptance = await this.#platform.framework.invoke(request);
      const stored = this.#platform.runtimePort.getResult(acceptance.runtimeExecutionReference);
      if (stored === undefined) {
        throw new SimpleAgentError(
          'AGENT_INVOKE_FAILED',
          'Agent invocation completed but Runtime result was unavailable.',
          acceptance.runtimeExecutionReference,
        );
      }
      return mapRuntimeResultToAgentResult(stored.runtime, {
        provider: this.#platform.model.provider,
        modelId: this.#platform.model.modelId,
        durationMs: Date.now() - startedAt,
        configuredTools: this.#platform.configuredToolCount,
      });
    } catch (error) {
      throw mapInvokeError(error);
    }
  }

  #ensureOpen(): void {
    if (this.#closed) {
      throw new SimpleAgentError(
        'AGENT_CLOSED',
        'This agent was closed. Create a new agent with createAgent(...).',
      );
    }
  }
}

export function createAgent(options: CreateAgentOptions): Agent {
  const normalized = normalizeCreateAgentOptions(options);
  // Synchronous API surface: bootstrap starts immediately; first await points are invoke/stream/close.
  // Construction failures surface as sync throw when the promise rejects on microtask — use createAgentAsync internally.
  return createAgentSyncFacade(normalized);
}

function createAgentSyncFacade(normalized: ReturnType<typeof normalizeCreateAgentOptions>): Agent {
  let platformPromise: Promise<EmbeddedPlatform> | undefined;
  let platform: EmbeddedPlatform | undefined;
  let closed = false;
  let initError: SimpleAgentError | undefined;

  const ensurePlatform = async (): Promise<EmbeddedPlatform> => {
    if (closed) {
      throw new SimpleAgentError(
        'AGENT_CLOSED',
        'This agent was closed. Create a new agent with createAgent(...).',
      );
    }
    if (initError !== undefined) throw initError;
    if (platform !== undefined) return platform;
    platformPromise ??= buildEmbeddedPlatform(normalized).catch((error: unknown) => {
      initError = mapInitError(error);
      throw initError;
    });
    platform = await platformPromise;
    return platform;
  };

  // Eagerly start bootstrap so create-time failures surface early on first await.
  void ensurePlatform().catch(() => undefined);

  const agent: Agent = {
    async invoke(input: string): Promise<AgentResult> {
      const ready = await ensurePlatform();
      return new SimpleAgent(ready).invoke(input);
    },
    async *stream(input: string, options?: StreamOptions): AsyncIterable<AgentStreamEvent> {
      const ready = await ensurePlatform();
      yield* new SimpleAgent(ready).stream(input, options);
    },
    async *replayStream(
      executionId: string,
      afterSequence?: number,
    ): AsyncIterable<AgentStreamEvent> {
      const ready = await ensurePlatform();
      yield* new SimpleAgent(ready).replayStream(executionId, afterSequence);
    },
    async approve(approvalId: string): Promise<void> {
      const ready = await ensurePlatform();
      await new SimpleAgent(ready).approve(approvalId);
    },
    async reject(approvalId: string, reason?: string): Promise<void> {
      const ready = await ensurePlatform();
      await new SimpleAgent(ready).reject(approvalId, reason);
    },
    async resume(executionId: string): Promise<AgentResult> {
      const ready = await ensurePlatform();
      return new SimpleAgent(ready).resume(executionId);
    },
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      if (platform !== undefined) {
        await platform.dispose();
        return;
      }
      if (platformPromise !== undefined) {
        try {
          const ready = await platformPromise;
          await ready.dispose();
        } catch {
          // Init failed; nothing to dispose.
        }
      }
    },
  };

  return agent;
}

function normalizeInput(input: string): string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'invoke/stream input must be a non-empty string.');
  }
  return input.trim();
}

function buildInvocationRequest(params: {
  readonly platform: EmbeddedPlatform;
  readonly objective: string;
  readonly correlationId: string;
  readonly authorization: AgentInvocationRequest['authorization'];
  readonly securityContextReference: string;
}): AgentInvocationRequest {
  return freeze({
    id: `invocation:${crypto.randomUUID()}`,
    agentId: params.platform.agentId,
    version: '1.0.0',
    objective: params.objective,
    initiatingPrincipalId: EMBEDDED_USER,
    agentPrincipalId: params.platform.agentPrincipalId,
    scope: params.platform.scope,
    inputs: Object.freeze({}),
    constraints: Object.freeze({}),
    delegationReferences: Object.freeze([]),
    securityContextReference: params.securityContextReference,
    authorization: params.authorization,
    correlationId: params.correlationId,
    causationId: null,
    requestedAt: new Date().toISOString(),
    versionPolicyVersion: EMBEDDED_POLICY_VERSION,
  });
}

function mapInitError(error: unknown): SimpleAgentError {
  if (error instanceof SimpleAgentError) return error;
  if (error instanceof AgentError) {
    return new SimpleAgentError(
      'AGENT_INIT_FAILED',
      `Agent initialization failed: ${error.message}`,
      error.diagnosticId,
      { cause: error },
    );
  }
  const message = error instanceof Error ? error.message : 'Agent initialization failed.';
  return new SimpleAgentError('AGENT_INIT_FAILED', message, undefined, { cause: error });
}

function mapInvokeError(error: unknown): SimpleAgentError {
  if (error instanceof SimpleAgentError) return error;
  const approval = extractApprovalRequiredError(error);
  if (approval !== undefined) return approval;
  const fromCause = extractSimpleAgentFromCause(error);
  if (fromCause !== undefined) return fromCause;
  if (error instanceof AgentError) {
    if (error.code === 'AGENT_RUNTIME_HANDOFF_FAILED') {
      return mapHandoffCause(error, 'AGENT_INVOKE_FAILED');
    }
    return new SimpleAgentError(
      'AGENT_INVOKE_FAILED',
      'Agent invocation failed. Check configuration and try again.',
      error.diagnosticId,
      { cause: error },
    );
  }
  const toolError = mapNormalizedToolCause(error);
  if (toolError !== undefined) return toolError;
  return new SimpleAgentError(
    'AGENT_INVOKE_FAILED',
    'Agent invocation failed. Check configuration and try again.',
    undefined,
    { cause: error },
  );
}

function mapStreamError(error: unknown): SimpleAgentError {
  if (error instanceof SimpleAgentError) return error;
  const approval = extractApprovalRequiredError(error);
  if (approval !== undefined) return approval;
  const fromCause = extractSimpleAgentFromCause(error);
  if (fromCause !== undefined) return fromCause;
  if (error instanceof AgentError) {
    if (error.code === 'AGENT_RUNTIME_HANDOFF_FAILED') {
      return mapHandoffCause(error, 'AGENT_STREAM_FAILED');
    }
    return new SimpleAgentError(
      'AGENT_STREAM_FAILED',
      'Agent stream failed. Check configuration and try again.',
      error.diagnosticId,
      { cause: error },
    );
  }
  const toolError = mapNormalizedToolCause(error);
  if (toolError !== undefined) return toolError;
  return new SimpleAgentError(
    'AGENT_STREAM_FAILED',
    'Agent stream failed. Check configuration and try again.',
    undefined,
    { cause: error },
  );
}

function extractSimpleAgentFromCause(error: unknown): SimpleAgentError | undefined {
  let current: unknown = error;
  while (current instanceof Error) {
    if (current instanceof SimpleAgentError) return current;
    current = current.cause;
  }
  return undefined;
}

function extractApprovalRequiredError(error: unknown): SimpleAgentError | undefined {
  let current: unknown = error;
  while (current instanceof Error) {
    if (current instanceof SimpleAgentError && current.code === 'AGENT_TOOL_APPROVAL_REQUIRED') {
      return current;
    }
    const name = current.name;
    const code = (current as { code?: string }).code;
    if (name === 'EmbeddedApprovalRequiredError' || code === 'TOOL_APPROVAL_REQUIRED') {
      const approvalId =
        (current as { approvalId?: string }).approvalId ??
        (current as { diagnosticId?: string }).diagnosticId;
      const executionId = (current as { executionId?: string }).executionId;
      return new SimpleAgentError('AGENT_TOOL_APPROVAL_REQUIRED', current.message, approvalId, {
        cause: current,
        ...(approvalId === undefined ? {} : { approvalId }),
        ...(executionId === undefined ? {} : { executionId }),
      });
    }
    current = current.cause;
  }
  return undefined;
}

function mapNormalizedToolCause(error: unknown): SimpleAgentError | undefined {
  const cause = error instanceof Error ? (error.cause ?? error) : error;
  if (!(cause instanceof Error)) return undefined;
  const code = (cause as { code?: string }).code;
  const message = cause.message;
  const diagnosticId = (cause as { diagnosticId?: string }).diagnosticId;
  if (code === 'TOOL_AUTHORIZATION') {
    return new SimpleAgentError('AGENT_TOOL_AUTHORIZATION', message, diagnosticId, { cause });
  }
  if (code === 'TOOL_APPROVAL_REQUIRED') {
    return new SimpleAgentError('AGENT_TOOL_APPROVAL_REQUIRED', message, diagnosticId, { cause });
  }
  if (code === 'TOOL_REJECTED') {
    return new SimpleAgentError('AGENT_TOOL_REJECTED', message, diagnosticId, { cause });
  }
  return undefined;
}

function mapHandoffCause(
  error: AgentError,
  fallback: 'AGENT_INVOKE_FAILED' | 'AGENT_STREAM_FAILED',
): SimpleAgentError {
  const fromCause = extractSimpleAgentFromCause(error);
  if (fromCause !== undefined) return fromCause;
  const cause = error.cause;
  const text = cause instanceof Error ? cause.message : error.message;
  if (/timeout/i.test(text)) {
    return new SimpleAgentError('AGENT_TIMEOUT', 'Agent invocation timed out.', error.diagnosticId, {
      cause: error,
    });
  }
  if (/provider|unavailable|OPENAI|ai_/i.test(text)) {
    return new SimpleAgentError(
      'AGENT_PROVIDER_UNAVAILABLE',
      'The configured AI provider is unavailable.',
      error.diagnosticId,
      { cause: error },
    );
  }
  return new SimpleAgentError(
    fallback,
    fallback === 'AGENT_STREAM_FAILED'
      ? 'Agent stream failed. Check configuration and try again.'
      : 'Agent invocation failed. Check configuration and try again.',
    error.diagnosticId,
    { cause: error },
  );
}
