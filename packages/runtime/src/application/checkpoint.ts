import type { ExecutionCheckpoint, ExecutionStage } from '../contracts/runtime.js';
import { RuntimeError } from '../errors/runtime-error.js';

export class CheckpointConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'CheckpointConflictError';
  }
}

/** Reject undefined and non-JSON-serializable values; null and other JSON values are allowed. */
export function assertCheckpointableValue(value: unknown, label: string): unknown {
  if (value === undefined) {
    throw new RuntimeError(
      'RUNTIME_EXECUTION_FAILED',
      `${label} is undefined and cannot be durably checkpointed`,
    );
  }
  try {
    const serialized = JSON.stringify(value);
    return JSON.parse(serialized) as unknown;
  } catch (error) {
    throw new RuntimeError(
      'RUNTIME_EXECUTION_FAILED',
      `${label} is not JSON-serializable`,
      { cause: error },
    );
  }
}

export function hasValidCapabilityResult(checkpoint: ExecutionCheckpoint): boolean {
  if (!Object.prototype.hasOwnProperty.call(checkpoint, 'capabilityResult')) return false;
  if (checkpoint.capabilityResult === undefined) return false;
  try {
    assertCheckpointableValue(checkpoint.capabilityResult, 'capabilityResult');
    return true;
  } catch {
    return false;
  }
}

export function requirePostInvokeResult(checkpoint: ExecutionCheckpoint): unknown {
  if (checkpoint.stage !== 'post-invoke' && checkpoint.stage !== 'terminal') {
    throw new RuntimeError(
      'RUNTIME_EXECUTION_FAILED',
      `capabilityResult restore requires post-invoke or terminal stage, got ${checkpoint.stage}`,
    );
  }
  if (!hasValidCapabilityResult(checkpoint)) {
    throw new RuntimeError(
      'RUNTIME_EXECUTION_FAILED',
      'Malformed post-invoke checkpoint: capabilityResult missing or invalid',
    );
  }
  return assertCheckpointableValue(checkpoint.capabilityResult, 'capabilityResult');
}

export function stripConcurrencyFields(
  checkpoint: ExecutionCheckpoint,
): Omit<ExecutionCheckpoint, 'concurrencyToken' | 'concurrencyRevision'> {
  const { concurrencyToken, concurrencyRevision, ...rest } = checkpoint;
  void concurrencyToken;
  void concurrencyRevision;
  return rest;
}

export function isResumeSafeStage(stage: ExecutionStage): boolean {
  return (
    stage === 'accepted' ||
    stage === 'post-planning' ||
    stage === 'post-workflow' ||
    stage === 'post-invoke'
  );
}
