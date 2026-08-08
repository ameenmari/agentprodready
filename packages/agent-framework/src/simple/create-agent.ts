import { AgentError, freeze, type AgentInvocationRequest } from '../index.js';
import { buildEmbeddedPlatform, type EmbeddedPlatform } from './embedded-platform.js';
import { EMBEDDED_POLICY_VERSION, EMBEDDED_USER } from './embedded-security.js';
import { SimpleAgentError } from './errors.js';
import { mapRuntimeResultToAgentResult } from './result-map.js';
import { mapRuntimeStream } from './stream-map.js';
import type { Agent, AgentResult, AgentStreamEvent, CreateAgentOptions } from './types.js';
import { normalizeCreateAgentOptions } from './validate-options.js';

class SimpleAgent implements Agent {
  #closed = false;
  readonly #platform: EmbeddedPlatform;

  public constructor(platform: EmbeddedPlatform) {
    this.#platform = platform;
  }

  public async invoke(input: string): Promise<AgentResult> {
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
      const acceptance = await this.#platform.framework.invoke(request);
      const stored = this.#platform.runtimePort.getResult(acceptance.runtimeExecutionReference);
      if (stored === undefined) {
        throw new SimpleAgentError(
          'AGENT_INVOKE_FAILED',
          'Agent invocation completed but Runtime result was unavailable.',
          acceptance.runtimeExecutionReference,
        );
      }
      return mapRuntimeResultToAgentResult(stored.runtime);
    } catch (error) {
      throw mapInvokeError(error);
    }
  }

  public async *stream(input: string): AsyncIterable<AgentStreamEvent> {
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
      const runtimeStream = this.#platform.runtimePort.getStream(acceptance.runtimeExecutionReference);
      if (runtimeStream === undefined) {
        throw new SimpleAgentError(
          'AGENT_STREAM_FAILED',
          'Agent stream handoff completed but no stream was available.',
          acceptance.runtimeExecutionReference,
        );
      }
      yield* mapRuntimeStream(acceptance.runtimeExecutionReference, runtimeStream);
    } catch (error) {
      throw mapStreamError(error);
    }
  }

  public async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    await this.#platform.dispose();
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
    async *stream(input: string): AsyncIterable<AgentStreamEvent> {
      const ready = await ensurePlatform();
      yield* new SimpleAgent(ready).stream(input);
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
  return new SimpleAgentError(
    'AGENT_INVOKE_FAILED',
    'Agent invocation failed. Check configuration and try again.',
    undefined,
    { cause: error },
  );
}

function mapStreamError(error: unknown): SimpleAgentError {
  if (error instanceof SimpleAgentError) return error;
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
  return new SimpleAgentError(
    'AGENT_STREAM_FAILED',
    'Agent stream failed. Check configuration and try again.',
    undefined,
    { cause: error },
  );
}

function mapHandoffCause(
  error: AgentError,
  fallback: 'AGENT_INVOKE_FAILED' | 'AGENT_STREAM_FAILED',
): SimpleAgentError {
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
