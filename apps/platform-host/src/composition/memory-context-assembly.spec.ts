import type { ExecutionContext } from '@agentforge/foundation';
import type { KnowledgeRetrievalResult } from '@agentforge/knowledge';
import {
  InMemoryMemoryDiagnostics,
  InMemoryMemoryEvents,
  MemoryEngine,
  NoopMemoryAiPort,
  PersistenceBackedMemoryProvider,
  WeightedMemoryRanking,
  type MemoryAuthorization,
  type MemoryCaptureRequest,
  type MemoryTelemetry,
} from '@agentforge/memory';
import { InMemoryPersistenceProvider } from '@agentforge/persistence';
import {
  ContextAssemblyEngine,
  DefaultContextPolicyEvaluator,
  InMemoryContextDiagnostics,
  InMemoryContextEvents,
  type ContextAssemblyPolicy,
  type ContextTelemetry,
} from '@agentforge/context-assembly';
import type { ExecutionPlan } from '@agentforge/planning';
import type { WorkflowSnapshot } from '@agentforge/workflow';
import { describe, expect, it, vi } from 'vitest';

describe('Context Assembly + Persistence-backed Memory', () => {
  it('assembles durable recalled Memory without Persistence type leakage', async () => {
    const persistence = new InMemoryPersistenceProvider();
    const memoryProvider = new PersistenceBackedMemoryProvider(persistence);
    const telemetry: MemoryTelemetry = {
      captured: vi.fn(),
      transitioned: vi.fn(),
      retrieved: vi.fn(),
      failed: vi.fn(),
    };
    const engine = new MemoryEngine(
      memoryProvider,
      memoryProvider,
      new WeightedMemoryRanking(),
      new NoopMemoryAiPort(),
      new InMemoryMemoryDiagnostics(),
      new InMemoryMemoryEvents(),
      telemetry,
    );
    const context: ExecutionContext = {
      executionId: 'execution-1',
      correlationId: 'correlation-1',
      tenantId: 'tenant-1',
      workspaceId: 'workspace-1',
      startedAt: '2026-08-07T00:00:00.000Z',
      configurationVersion: 'configuration-1',
      securityContextId: 'security-1',
      attributes: {},
    };
    const authorization: MemoryAuthorization = {
      authorized: true,
      decisionId: 'decision-1',
      allowedLabels: ['public'],
      allowedVisibilities: ['user', 'workspace'],
    };
    const capture: MemoryCaptureRequest = {
      requestId: 'capture-1',
      sourceEventId: 'event-assembly',
      producer: 'runtime',
      execution: { executionId: 'execution-1', correlationId: 'correlation-1' },
      context,
      ownership: { tenantId: 'tenant-1', workspaceId: 'workspace-1', userId: 'user' },
      authorization,
      content: { observation: 'assembled-memory' },
      metadata: {},
      securityLabels: ['public'],
      classification: {
        category: 'episodic',
        importance: 'normal',
        lifetime: 'persistent',
        visibility: 'user',
      },
      retention: { policyId: 'r', category: 'permanent' },
      version: '1',
      occurredAt: '2026-08-05T00:00:00.000Z',
      semantics: { sideEffect: 'state-producing', idempotency: 'idempotent' },
    };
    let record = await engine.capture(capture);
    for (const action of ['classify', 'organize', 'index', 'make-available'] as const) {
      record = await engine.transition({
        requestId: `t-${action}`,
        memoryId: record.id,
        expectedLifecycleVersion: record.lifecycleVersion,
        action,
        authorization,
        context,
        semantics: { sideEffect: 'mutating', idempotency: 'idempotent' },
      });
    }
    const recalled = await engine.retrieve({
      requestId: 'retrieve-1',
      query: 'assembled',
      node: { workflowId: 'workflow-1', nodeId: 'task-1', kind: 'capability', capability: 'answer' },
      context,
      authorization,
      categories: ['episodic'],
      strategy: 'keyword',
      ownership: { userId: 'user' },
      maximumResults: 10,
      ranking: {
        relevanceWeight: 1,
        importanceWeight: 1,
        recencyWeight: 1,
        policyVersion: 'rank-1',
      },
      metadata: {},
    });
    expect(recalled.memories).toHaveLength(1);

    const plan: ExecutionPlan = {
      planId: 'plan-1',
      objective: 'answer',
      goal: { statement: 'answer' },
      intent: { name: 'respond', outcome: 'complete' },
      strategy: 'workflow',
      requiredCapabilities: [{ capability: 'answer', constraints: {} }],
      tasks: [
        {
          id: 'task-1',
          description: 'answer',
          capability: 'answer',
          dependencies: [],
          optional: false,
        },
      ],
      workflow: { id: 'workflow-1', source: 'generated', taskIds: ['task-1'] },
      decisionPoints: [],
      validation: { valid: true, checkedAt: '2026-08-06T00:00:00.000Z' },
      optimization: { removedTaskIds: [], originalTaskCount: 1, optimizedTaskCount: 1 },
      metadata: {
        plannerVersion: 'planner-1',
        createdAt: '2026-08-06T00:00:00.000Z',
        executionId: 'execution-1',
        correlationId: 'correlation-1',
      },
    };
    const workflow: WorkflowSnapshot = {
      workflowId: 'workflow-1',
      status: 'running',
      nodeStates: { 'task-1': 'executing' },
      branchOutcomes: {},
      loopIterations: {},
      history: ['created', 'initialized', 'running'],
    };
    const knowledge: KnowledgeRetrievalResult = {
      requestId: 'knowledge-1',
      status: 'empty',
      querySummary: '',
      items: [],
      strategies: [],
      securityScope: {
        tenantId: 'tenant-1',
        workspaceId: 'workspace-1',
        decisionId: 'decision-1',
      },
      partialReasons: [],
      diagnosticId: 'knowledge-diagnostic',
      metadata: {},
    };
    const policy: ContextAssemblyPolicy = {
      version: 'policy-1',
      schemaVersion: 'context-package-1',
      minimumPriority: 0,
      maximumLogicalUnits: 100,
      sourceBudgets: {},
      sourcePriorities: {
        execution: 100,
        plan: 90,
        workflow: 80,
        knowledge: 70,
        memory: 60,
        runtime: 50,
      },
      ordering: 'priority',
    };
    const contextTelemetry: ContextTelemetry = { completed: vi.fn(), failed: vi.fn() };
    const assembly = new ContextAssemblyEngine(
      new DefaultContextPolicyEvaluator(),
      new InMemoryContextDiagnostics(),
      new InMemoryContextEvents(),
      contextTelemetry,
    );
    const packaged = await assembly.assemble({
      requestId: 'assembly-1',
      context,
      node: { workflowId: 'workflow-1', nodeId: 'task-1', kind: 'capability', capability: 'answer' },
      plan,
      workflow,
      knowledge,
      memory: recalled,
      runtime: {
        state: 'running',
        cancellationRequested: false,
        resourceClass: 'standard',
        diagnosticsReference: 'runtime-diagnostic',
        version: 'runtime-1',
        attributes: {},
      },
      authorization: {
        authorized: true,
        decisionId: 'decision-1',
        allowedLabels: ['public'],
        allowedSources: ['execution', 'plan', 'workflow', 'knowledge', 'memory', 'runtime'],
      },
      policy,
      platformVersion: '0.5.0',
    });
    expect(packaged.elements.some((item) => item.source === 'memory')).toBe(true);
    expect(packaged.elements.some((item) => item.sourceReference.includes(record.id))).toBe(true);
    expect(JSON.stringify(packaged)).not.toMatch(/PersistedEntity|persistence_entities|scope_key/iu);
  });
});
