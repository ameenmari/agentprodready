import type { ToolContract } from '@agentprodready/tool-framework';
import { SimpleAgentError } from './errors.js';

const TOOL_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;

export type SimpleToolSideEffect = 'read-only' | 'mutating' | 'external-side-effect';
export type SimpleToolIdempotency = 'idempotent' | 'non-idempotent';
export type SimpleToolApproval = 'none' | 'required';

export type SimpleToolExecute = (args: Readonly<Record<string, unknown>>) => unknown;

export interface SimpleToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly execute: SimpleToolExecute;
  readonly sideEffect?: SimpleToolSideEffect;
  readonly idempotency?: SimpleToolIdempotency;
  readonly approvalRequirement?: SimpleToolApproval;
}

/** Opaque simple tool handle produced by {@link tool}. */
export interface SimpleTool {
  readonly __simpleTool: true;
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly sideEffect: SimpleToolSideEffect;
  readonly idempotency: SimpleToolIdempotency;
  readonly approvalRequirement: SimpleToolApproval;
  readonly execute: SimpleToolExecute;
  readonly contract: ToolContract;
}

export function tool(definition: SimpleToolDefinition): SimpleTool {
  const record = definition as SimpleToolDefinition | null | undefined;
  if (typeof record !== 'object' || record === null) {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'tool(...) requires a definition object.');
  }
  if (typeof record.name !== 'string' || !TOOL_NAME.test(record.name)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'tool name must match /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.',
    );
  }
  if (typeof record.description !== 'string' || record.description.trim() === '') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'tool description must be a non-empty string.');
  }
  const parameters = record.parameters as unknown;
  if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'tool parameters must be a JSON Schema object.');
  }
  const parametersRecord = parameters as Readonly<Record<string, unknown>>;
  if (parametersRecord['type'] !== 'object') {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      'tool parameters.type must be "object".',
    );
  }
  if (typeof record.execute !== 'function') {
    throw new SimpleAgentError('AGENT_INVALID_CONFIG', 'tool execute must be a function.');
  }

  const sideEffect = record.sideEffect ?? 'mutating';
  const idempotency = record.idempotency ?? 'non-idempotent';
  const approvalRequirement = record.approvalRequirement ?? 'none';
  assertEnum(sideEffect, ['read-only', 'mutating', 'external-side-effect'], 'sideEffect');
  assertEnum(idempotency, ['idempotent', 'non-idempotent'], 'idempotency');
  assertEnum(approvalRequirement, ['none', 'required'], 'approvalRequirement');

  const capability = `tool:simple.${record.name}`;
  const contract: ToolContract = Object.freeze({
    id: record.name,
    capability,
    version: '1',
    inputSchema: Object.freeze({ ...parametersRecord }),
    outputSchema: Object.freeze({ type: 'object' }),
    sideEffect,
    idempotency,
    approvalRequirement,
    metadata: Object.freeze({
      description: record.description.trim(),
      source: 'simple-tool',
    }),
    pluginId: 'simple-agent',
    contributionId: `tool:${record.name}`,
  });

  return Object.freeze({
    __simpleTool: true as const,
    name: record.name,
    description: record.description.trim(),
    parameters: Object.freeze({ ...parametersRecord }),
    sideEffect,
    idempotency,
    approvalRequirement,
    execute: record.execute,
    contract,
  });
}

export function isSimpleTool(value: unknown): value is SimpleTool {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __simpleTool?: unknown }).__simpleTool === true &&
    typeof (value as SimpleTool).name === 'string' &&
    typeof (value as SimpleTool).execute === 'function' &&
    typeof (value as SimpleTool).contract === 'object'
  );
}

function assertEnum<T extends string>(value: T, allowed: readonly T[], field: string): void {
  if (!allowed.includes(value)) {
    throw new SimpleAgentError(
      'AGENT_INVALID_CONFIG',
      `tool ${field} must be one of: ${allowed.join(', ')}.`,
    );
  }
}
