import type { HandoffRequest } from './types.js';

const HANDOFF_PREFIX = '__APR_HANDOFF__';
const HANDOFF_SUFFIX = '__';

/** Produce a handoff marker for agent text output (orchestration detects and routes). */
export function handoff(options: {
  readonly to: string;
  readonly reason: string;
  readonly input?: string;
}): string {
  if (typeof options.to !== 'string' || options.to.trim() === '') {
    throw new Error('handoff requires a non-empty to agent id');
  }
  if (typeof options.reason !== 'string' || options.reason.trim() === '') {
    throw new Error('handoff requires a non-empty reason');
  }
  const payload: HandoffRequest = {
    to: options.to.trim(),
    reason: options.reason.trim(),
    ...(options.input === undefined ? {} : { input: options.input }),
  };
  return `${HANDOFF_PREFIX}${JSON.stringify(payload)}${HANDOFF_SUFFIX}`;
}

export function parseHandoff(value: unknown): HandoffRequest | undefined {
  if (value !== null && typeof value === 'object' && 'to' in value && 'reason' in value) {
    const record = value as Record<string, unknown>;
    if (typeof record.to === 'string' && typeof record.reason === 'string') {
      return {
        to: record.to,
        reason: record.reason,
        ...(typeof record.input === 'string' ? { input: record.input } : {}),
      };
    }
  }
  if (typeof value !== 'string') return undefined;
  const start = value.indexOf(HANDOFF_PREFIX);
  if (start < 0) return undefined;
  const jsonStart = start + HANDOFF_PREFIX.length;
  const end = value.indexOf(HANDOFF_SUFFIX, jsonStart);
  if (end < 0) return undefined;
  try {
    const parsed: unknown = JSON.parse(value.slice(jsonStart, end));
    return parseHandoff(parsed);
  } catch {
    return undefined;
  }
}
