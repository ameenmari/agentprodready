import { SimpleAgentError } from './errors.js';
import type { AgentModel } from './types.js';

/** Default Simple Agent facade output budget when callers omit maxOutputTokens. */
export const DEFAULT_SIMPLE_MAX_OUTPUT_TOKENS = 512;

/** Upper bound for Simple Agent maxOutputTokens configuration. */
export const SIMPLE_MAX_OUTPUT_TOKENS_CEILING = 128_000;

export function validateMaxOutputTokens(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'maxOutputTokens must be a positive integer.',
    );
  }
  if (value <= 0) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'maxOutputTokens must be greater than 0.',
    );
  }
  if (value > SIMPLE_MAX_OUTPUT_TOKENS_CEILING) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      `maxOutputTokens must not exceed ${String(SIMPLE_MAX_OUTPUT_TOKENS_CEILING)}.`,
    );
  }
  return value;
}

export function resolveSimpleMaxOutputTokens(model: AgentModel): number {
  const configured = model.maxOutputTokens;
  if (configured === undefined) {
    return DEFAULT_SIMPLE_MAX_OUTPUT_TOKENS;
  }
  return validateMaxOutputTokens(configured);
}
