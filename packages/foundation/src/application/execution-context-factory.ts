import type { CreateExecutionContextRequest, ExecutionContext } from '../contracts/foundation.js';
import { FoundationError } from '../errors/foundation-error.js';
import { deepFreeze, requireText } from '../internal/validation.js';

export class ExecutionContextFactory {
  public create(request: CreateExecutionContextRequest): ExecutionContext {
    const startedAt = request.startedAt ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(startedAt))) {
      throw new FoundationError('FOUNDATION_INVALID_ARGUMENT', 'startedAt must be ISO-8601');
    }
    if (request.securityContext !== undefined && request.securityContext.id !== request.securityContextId) {
      throw new FoundationError('FOUNDATION_INVALID_ARGUMENT', 'securityContext identity mismatch');
    }
    const context: ExecutionContext = {
      executionId: requireText(request.executionId, 'executionId'),
      correlationId: requireText(request.correlationId, 'correlationId'),
      ...(request.tenantId === undefined ? {} : { tenantId: requireText(request.tenantId, 'tenantId') }),
      ...(request.workspaceId === undefined ? {} : { workspaceId: requireText(request.workspaceId, 'workspaceId') }),
      startedAt: new Date(startedAt).toISOString(),
      configurationVersion: requireText(request.configurationVersion, 'configurationVersion'),
      securityContextId: requireText(request.securityContextId, 'securityContextId'),
      ...(request.securityContext === undefined ? {} : { securityContext: { ...request.securityContext } }),
      attributes: { ...(request.attributes ?? {}) },
    };
    return deepFreeze(context);
  }
}
