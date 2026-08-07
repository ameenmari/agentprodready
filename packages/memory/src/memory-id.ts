/**
 * Strict fail-closed parser for canonical Memory ids:
 *   memory:{tenantId}:{sourceEventId}
 *
 * Unrestricted split-on-":" is unsafe because identifiers may historically contain ":".
 * v0.5 accepts only the unambiguous form where neither segment contains ":".
 */

export interface ParsedMemoryId {
  readonly tenantId: string;
  readonly sourceEventId: string;
}

const CANONICAL = /^memory:([^:]+):([^:]+)$/u;

export function parseCanonicalMemoryId(id: string): ParsedMemoryId | undefined {
  if (typeof id !== 'string' || id.trim() === '') return undefined;
  const match = CANONICAL.exec(id);
  if (match === null) return undefined;
  const tenantId = match[1];
  const sourceEventId = match[2];
  if (tenantId === undefined || sourceEventId === undefined) return undefined;
  if (tenantId.trim() === '' || sourceEventId.trim() === '') return undefined;
  return Object.freeze({ tenantId, sourceEventId });
}

export function isCanonicalMemoryIdSegment(value: string): boolean {
  return value.trim() !== '' && !value.includes(':');
}
