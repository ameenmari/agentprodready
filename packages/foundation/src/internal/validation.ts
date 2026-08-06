import { FoundationError } from '../errors/foundation-error.js';

export function requireText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new FoundationError('FOUNDATION_INVALID_ARGUMENT', `${field} must not be empty`);
  }
  return normalized;
}

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}
