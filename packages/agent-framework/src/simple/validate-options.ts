import { inMemory, isSimpleMemory, type SimpleMemory } from './memory.js';
import { SimpleAgentError } from './errors.js';
import { isAgentModel } from './models.js';
import { isSimpleTool, type SimpleTool } from './tool.js';
import type { CreateAgentOptions } from './types.js';

const ALLOWED_KEYS = new Set(['model', 'instructions', 'name', 'description', 'tools', 'memory']);

export interface NormalizedCreateAgentOptions {
  readonly model: CreateAgentOptions['model'];
  readonly instructions: string;
  readonly name: string;
  readonly description: string;
  readonly tools: readonly SimpleTool[];
  readonly memory?: SimpleMemory;
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
        `Unknown createAgent option "${key}". Supported options: model, instructions, name, description, tools, memory.`,
      );
    }
  }

  if (!isAgentModel(record.model)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_MODEL',
      'model must be reference(), openai("model-id"), anthropic("model-id"), gemini("model-id"), or openaiCompatible({ baseUrl, model }).',
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

  const tools = normalizeTools(record.tools);
  const memory = normalizeMemory(record.memory);

  return Object.freeze({
    model: record.model,
    instructions: record.instructions.trim(),
    name: (record.name ?? 'agent').trim(),
    description: (record.description ?? 'Embedded AgentProdReady agent').trim(),
    tools,
    ...(memory === undefined ? {} : { memory }),
  });
}

function normalizeTools(value: unknown): readonly SimpleTool[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'tools must be an array of tool(...) handles.');
  }
  const seen = new Set<string>();
  const tools: SimpleTool[] = [];
  for (const item of value) {
    if (!isSimpleTool(item)) {
      throw new SimpleAgentError(
        'AGENT_INVALID_CONFIG',
        'Each tools entry must be created with tool({ name, description, parameters, execute }).',
      );
    }
    if (seen.has(item.name)) {
      throw new SimpleAgentError(
        'AGENT_INVALID_CONFIG',
        `Duplicate tool name "${item.name}". Tool names must be unique.`,
      );
    }
    seen.add(item.name);
    tools.push(item);
  }
  return Object.freeze(tools);
}

function normalizeMemory(value: unknown): SimpleMemory | undefined {
  if (value === undefined) return undefined;
  if (value === true) return inMemory();
  if (isSimpleMemory(value)) return value;
  throw new SimpleAgentError(
    'AGENT_INVALID_CONFIG',
    'memory must be true (ephemeral), inMemory(), fileMemory({ directory }), or postgresMemory({ connectionString }).',
  );
}
