import type {
  EvaluationAudit,
  EvaluationEvents,
  EvaluationFact,
  EvaluationResult,
  EvaluationTelemetry,
} from '@agentprodready/evaluation';
import type { EventBus } from '@agentprodready/event-bus';
import { createPlatformEvent } from '@agentprodready/event-bus';
import type { InMemoryMetricsProvider } from '@agentprodready/observability';
import {
  LOCAL_POLICY_VERSION,
  LOCAL_PROJECT,
  LOCAL_TENANT,
  LOCAL_WORKSPACE,
} from '../../config/local-reference-config.js';

export class EventBusEvaluationEvents implements EvaluationEvents {
  public readonly facts: EvaluationFact[] = [];

  public constructor(private readonly eventBus: EventBus) {}

  public async publish(value: EvaluationFact): Promise<void> {
    this.facts.push(value);
    await this.eventBus.publish(
      createPlatformEvent({
        eventId: `evaluation:${value.requestId}:${value.type}`,
        type: value.type,
        contractVersion: '1',
        occurredAt: new Date().toISOString(),
        producer: 'platform-host-evaluation',
        correlationId: value.executionId,
        causationId: value.requestId,
        scope: Object.freeze({
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
          projectId: LOCAL_PROJECT,
        }),
        security: Object.freeze({
          classification: 'internal',
          labels: Object.freeze(['operations']),
          authorizationReference: value.securityDecisionId,
        }),
        payload: Object.freeze({
          requestId: value.requestId,
          executionId: value.executionId,
          diagnosticId: value.diagnosticId,
          securityDecisionId: value.securityDecisionId,
          version: value.version,
        }),
        retention: Object.freeze({ category: 'operational', policyVersion: LOCAL_POLICY_VERSION }),
        chainDepth: 0,
      }),
    );
  }
}

export class ObservabilityEvaluationTelemetry implements EvaluationTelemetry {
  public constructor(private readonly metrics: InMemoryMetricsProvider) {}

  public completed(
    status: EvaluationResult['status'],
    criteria: number,
    evidence: number,
  ): void {
    const at = new Date().toISOString();
    void this.metrics.record(
      Object.freeze({
        id: `metric:evaluation.completed:${status}:${at}`,
        name: 'evaluation.completed',
        kind: 'counter' as const,
        value: 1,
        unit: 'count',
        timestamp: at,
        component: 'evaluation',
        correlation: Object.freeze({
          correlationId: 'evaluation',
          causationId: null,
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
        }),
        labels: Object.freeze({
          status,
          criteriaCount: String(criteria),
          evidenceCount: String(evidence),
        }),
        aggregatedObservation: true as const,
      }),
    );
  }

  public failed(code: string): void {
    const at = new Date().toISOString();
    void this.metrics.record(
      Object.freeze({
        id: `metric:evaluation.failed:${code}:${at}`,
        name: 'evaluation.failed',
        kind: 'counter' as const,
        value: 1,
        unit: 'count',
        timestamp: at,
        component: 'evaluation',
        correlation: Object.freeze({
          correlationId: 'evaluation',
          causationId: null,
          tenantId: LOCAL_TENANT,
          workspaceId: LOCAL_WORKSPACE,
        }),
        labels: Object.freeze({ code }),
        aggregatedObservation: true as const,
      }),
    );
  }
}

export class HostEvaluationAudit implements EvaluationAudit {
  public readonly records: {
    readonly resultId: string;
    readonly requestId: string;
    readonly targetReference: string;
    readonly assessment: EvaluationResult['aggregate']['assessment'];
    readonly diagnosticId: string;
  }[] = [];

  public async record(
    value: Readonly<{
      resultId: string;
      requestId: string;
      targetReference: string;
      assessment: EvaluationResult['aggregate']['assessment'];
      diagnosticId: string;
    }>,
  ): Promise<void> {
    this.records.push(value);
  }
}
