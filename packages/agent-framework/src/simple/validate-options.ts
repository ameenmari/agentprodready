import { SimpleAgentError } from './errors.js';
import { isAgentModel } from './models.js';
import type { CreateAgentOptions } from './types.js';

const ALLOWED_KEYS = new Set(['model', 'instructions', 'name', 'description']);

export interface NormalizedCreateAgentOptions {
  readonly model: CreateAgentOptions['model'];
  readonly instructions: string;
  readonly name: string;
  readonly description: string;
}

export function normalizeCreateAgentOptions(options: unknown): NormalizedCreateAgentOptions {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'createAgent(options) requires an options object with model and instructions.',
    );
  }

  const record = options as CreateAgentOptions & Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new SimpleAgentError(
        'AGENT_INVALID_CONFIG',
        `Unknown createAgent option "${key}". Supported options: model, instructions, name, description.`,
      );
    }
  }

  if (!isAgentModel(record.model)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'model must be reference() or openai("model-id").',
    );
  }

  if (typeof record.instructions !== 'string' || record.instructions.trim() === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'instructions must be a non-empty string.',
    );
  }

  if (record.name !== undefined && (typeof record.name !== 'string' || record.name.trim() === '')) {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'name must be a non-empty string when provided.');
  }

  if (
    record.description !== undefined &&
    (typeof record.description !== 'string' || record.description.trim() === '')
  ) {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'description must be a non-empty string when provided.',
    );
  }

  return Object.freeze({
    model: record.model,
    instructions: record.instructions.trim(),
    name: (record.name ?? 'agent').trim(),
    description: (record.description ?? 'Embedded AgentProdReady agent').trim(),
  });
}
