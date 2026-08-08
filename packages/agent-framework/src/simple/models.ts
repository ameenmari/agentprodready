import { SimpleAgentError } from './errors.js';
import type { AgentModel } from './types.js';

export function reference(): AgentModel {
  return Object.freeze({ provider: 'reference', modelId: 'reference' });
}

export function openai(modelId: string): AgentModel {
  if (typeof modelId !== 'string' || modelId.trim() === '') {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'openai(modelId) requires a non-empty model id string, for example openai("gpt-4o-mini").',
    );
  }
  return Object.freeze({ provider: 'openai', modelId: modelId.trim() });
}

export function isAgentModel(value: unknown): value is AgentModel {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { provider?: unknown; modelId?: unknown };
  if (record.provider === 'reference') return record.modelId === 'reference';
  if (record.provider === 'openai') {
    return typeof record.modelId === 'string' && record.modelId.trim() !== '';
  }
  return false;
}
