import type { CapabilityBinding, CapabilityRequest, CapabilityResolver } from '@agentforge/capability-resolution';
import type {
  AiExecutionRequest,
  AiProviderFramework,
  NormalizedAiResult,
  NormalizedAiStreamEvent,
} from '@agentforge/ai-provider';
import { ProviderAttemptLedger, isFallbackEligibleAiError } from '@agentforge/runtime';
import type { ExecutionContext } from '@agentforge/foundation';
import type { AiRoutingMode } from '../config/local-reference-config.js';

export interface AiRoutingTelemetry {
  selected(implementationId: string): void;
  fallbackAttempted(from: string, to: string, code: string): void;
  fallbackSucceeded(from: string, to: string): void;
  fallbackExhausted(implementationId: string, code: string): void;
  streamFallbackPrevented(implementationId: string, code: string): void;
  toolFallbackPrevented(implementationId: string, code: string): void;
}

export interface AiRoutingDeps {
  readonly resolver: CapabilityResolver;
  readonly ai: AiProviderFramework;
  readonly mode: AiRoutingMode;
  readonly telemetry: AiRoutingTelemetry;
}

export function createNoopAiRoutingTelemetry(): AiRoutingTelemetry {
  return {
    selected: (): void => {},
    fallbackAttempted: (): void => {},
    fallbackSucceeded: (): void => {},
    fallbackExhausted: (): void => {},
    streamFallbackPrevented: (): void => {},
    toolFallbackPrevented: (): void => {},
  };
}

export async function executeAiWithRouting(
  deps: AiRoutingDeps,
  baseRequest: CapabilityRequest,
  initialBinding: CapabilityBinding,
  buildRequest: (binding: CapabilityBinding) => AiExecutionRequest,
  options?: Readonly<{ allowFallback: boolean }>,
): Promise<Readonly<{ result: NormalizedAiResult; binding: CapabilityBinding; ledger: ProviderAttemptLedger }>> {
  const allowFallback = options?.allowFallback !== false && deps.mode === 'fallback';
  const ledger = new ProviderAttemptLedger();
  let binding = initialBinding;
  const excluded: string[] = [];
  let priorFailedId: string | undefined;

  for (;;) {
    deps.telemetry.selected(binding.implementationId);
    ledger.beginProvider(binding.implementationId);
    try {
      const result = await deps.ai.execute(buildRequest(binding));
      ledger.recordOutcome(binding.implementationId, 'success');
      if (priorFailedId !== undefined) {
        deps.telemetry.fallbackSucceeded(priorFailedId, binding.implementationId);
      }
      return Object.freeze({ result, binding, ledger });
    } catch (error) {
      const code = errorCodeOf(error);
      const retryable = retryableOf(error);
      ledger.recordOutcome(binding.implementationId, 'failed', code);
      excluded.push(binding.implementationId);
      if (!allowFallback || !isFallbackEligibleAiError(code, retryable)) {
        throw error;
      }
      try {
        const next = await deps.resolver.resolveNext(
          Object.freeze({ ...baseRequest, requestId: `${baseRequest.requestId}:fb:${String(excluded.length)}` }),
          Object.freeze({ excludeImplementationIds: Object.freeze([...excluded]) }),
        );
        deps.telemetry.fallbackAttempted(binding.implementationId, next.implementationId, code);
        priorFailedId = binding.implementationId;
        binding = next;
      } catch {
        deps.telemetry.fallbackExhausted(binding.implementationId, code);
        throw error;
      }
    }
  }
}

export async function* streamAiWithRouting(
  deps: AiRoutingDeps,
  baseRequest: CapabilityRequest,
  initialBinding: CapabilityBinding,
  buildRequest: (binding: CapabilityBinding) => AiExecutionRequest,
  options?: Readonly<{ allowFallback: boolean }>,
): AsyncIterable<
  Readonly<{ binding: CapabilityBinding; event: NormalizedAiStreamEvent; ledger: ProviderAttemptLedger }>
> {
  const allowFallback = options?.allowFallback !== false && deps.mode === 'fallback';
  const ledger = new ProviderAttemptLedger();
  let binding = initialBinding;
  const excluded: string[] = [];
  let clientVisible = false;
  let priorFailedId: string | undefined;

  for (;;) {
    deps.telemetry.selected(binding.implementationId);
    ledger.beginProvider(binding.implementationId);
    let failedCode: string | undefined;
    let failedRetryable = false;
    try {
      for await (const event of deps.ai.stream(buildRequest(binding))) {
        if (event.type === 'content' || event.type === 'tool-call') {
          clientVisible = true;
        }
        if (event.type === 'failed') {
          failedCode = event.code;
          failedRetryable = event.retryable;
          if (!clientVisible && allowFallback && isFallbackEligibleAiError(event.code, event.retryable)) {
            break;
          }
          ledger.recordOutcome(binding.implementationId, 'failed', event.code);
          if (clientVisible && allowFallback && isFallbackEligibleAiError(event.code, event.retryable)) {
            deps.telemetry.streamFallbackPrevented(binding.implementationId, event.code);
          }
          yield Object.freeze({ binding, event, ledger });
          return;
        }
        yield Object.freeze({ binding, event, ledger });
        if (event.type === 'completed' || event.type === 'cancelled') {
          ledger.recordOutcome(
            binding.implementationId,
            event.type === 'cancelled' ? 'cancelled' : 'success',
          );
          if (priorFailedId !== undefined && event.type === 'completed') {
            deps.telemetry.fallbackSucceeded(priorFailedId, binding.implementationId);
          }
          return;
        }
      }
    } catch (error) {
      failedCode = errorCodeOf(error);
      failedRetryable = retryableOf(error);
      if (clientVisible || !allowFallback || !isFallbackEligibleAiError(failedCode, failedRetryable)) {
        if (clientVisible && allowFallback && isFallbackEligibleAiError(failedCode, failedRetryable)) {
          deps.telemetry.streamFallbackPrevented(binding.implementationId, failedCode);
        }
        ledger.recordOutcome(binding.implementationId, 'failed', failedCode);
        throw error;
      }
    }

    if (failedCode === undefined) {
      ledger.recordOutcome(binding.implementationId, 'failed', 'AI_UNKNOWN');
      return;
    }
    ledger.recordOutcome(binding.implementationId, 'failed', failedCode);
    excluded.push(binding.implementationId);
    try {
      const next = await deps.resolver.resolveNext(
        Object.freeze({ ...baseRequest, requestId: `${baseRequest.requestId}:sfb:${String(excluded.length)}` }),
        Object.freeze({ excludeImplementationIds: Object.freeze([...excluded]) }),
      );
      deps.telemetry.fallbackAttempted(binding.implementationId, next.implementationId, failedCode);
      priorFailedId = binding.implementationId;
      binding = next;
    } catch {
      deps.telemetry.fallbackExhausted(binding.implementationId, failedCode);
      throw Object.assign(new Error('AI provider fallback exhausted'), {
        code: failedCode,
        retryable: failedRetryable,
      });
    }
  }
}

export function noteToolFallbackPrevented(deps: AiRoutingDeps, implementationId: string, code: string): void {
  deps.telemetry.toolFallbackPrevented(implementationId, code);
}

function errorCodeOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return 'AI_UNKNOWN';
}

function retryableOf(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'retryable' in error && typeof error.retryable === 'boolean') {
    return error.retryable;
  }
  return false;
}

export function textGenerationRequest(
  context: ExecutionContext,
  nodeCapability: string,
  nodeId: string,
): CapabilityRequest {
  return Object.freeze({
    requestId: `${context.executionId}:${nodeId}:0`,
    capability: nodeCapability,
    context,
    node: Object.freeze({
      workflowId: `workflow:${context.executionId}`,
      nodeId,
      kind: 'capability' as const,
      capability: nodeCapability,
    }),
    constraints: Object.freeze({}),
  });
}
