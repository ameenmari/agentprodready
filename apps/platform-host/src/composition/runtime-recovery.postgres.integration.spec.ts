import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CompositionRoot } from '@agentprodready/composition';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '@agentprodready/persistence-postgres';
import {
  DEFAULT_RECOVERY_POLICY,
  InMemoryRuntimeEventPublisher,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
  type ExecutionCheckpoint,
} from '@agentprodready/runtime';
import { PersistenceExecutionCheckpointStore } from './persistence-execution-checkpoint-store.js';

const scope = Object.freeze({ tenantId: 'recovery-tenant', workspaceId: 'recovery-workspace' });

describe.skipIf(process.env['RUN_POSTGRES_TESTS'] !== '1')(
  'Runtime recovery PostgreSQL durability',
  () => {
    let provider: PostgresPersistenceProvider;
    let checkpoints: PersistenceExecutionCheckpointStore;

    beforeAll(async () => {
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      checkpoints = new PersistenceExecutionCheckpointStore(provider, scope);
    });

    afterAll(async () => {
      await provider.close();
    });

    function orchestrator(
      port: PersistenceExecutionCheckpointStore,
      invoke = vi.fn(async (work: unknown) => work),
    ): { runtime: RuntimeOrchestrator; invoke: typeof invoke } {
      const root = new CompositionRoot();
      root.build();
      return {
        runtime: new RuntimeOrchestrator({
          scopes: root,
          policies: new StaticRuntimePolicyProvider({
            timeoutMs: 60_000,
            maxAttempts: 1,
            maxConcurrency: 4,
            isRetryable: (): boolean => false,
            recovery: DEFAULT_RECOVERY_POLICY,
          }),
          planning: { plan: vi.fn(async (input: unknown) => ({ input })) },
          workflow: { execute: vi.fn(async (plan: unknown) => plan) },
          capabilities: { invoke },
          security: {
            authorize: vi.fn(async () => ({ authorized: true, decisionId: 'd1' })),
          },
          events: new InMemoryRuntimeEventPublisher(),
          telemetry: {
            transition: (): void => {},
            completed: (): void => {},
            failed: (): void => {},
            recovery: (): void => {},
          },
          checkpoints: port,
        }),
        invoke,
      };
    }

    it('survives provider recreation, resumes post-invoke, OCC, and excludes terminals', async () => {
      const executionId = `recovery:${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const deadlineAt = new Date(Date.now() + 60_000).toISOString();
      const checkpoint: ExecutionCheckpoint = Object.freeze({
        executionId,
        state: 'executing',
        stage: 'post-invoke',
        history: Object.freeze([
          { state: 'created' as const, occurredAt: now },
          { state: 'initializing' as const, occurredAt: now },
          { state: 'planning' as const, occurredAt: now },
          { state: 'executing' as const, occurredAt: now },
        ]),
        attempts: 1,
        maxAttempts: 1,
        startedAt: now,
        deadlineAt,
        timeoutMs: 60_000,
        cancelled: false,
        correlationId: `corr:${executionId}`,
        causationId: null,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        input: 'durable-hello',
        contextRequest: Object.freeze({
          executionId,
          correlationId: `corr:${executionId}`,
          tenantId: scope.tenantId,
          workspaceId: scope.workspaceId,
          configurationVersion: 'v1',
          securityContextId: 's1',
        }),
        plan: Object.freeze({ input: 'durable-hello' }),
        workflowWork: Object.freeze({ input: 'durable-hello' }),
        capabilityResult: Object.freeze({ durable: true, n: 7 }),
        recoveryPolicy: DEFAULT_RECOVERY_POLICY,
        terminal: false,
        checkpointVersion: 1 as const,
        updatedAt: now,
      });

      await checkpoints.store(checkpoint);

      await provider.close();
      provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
      await provider.assertReady();
      checkpoints = new PersistenceExecutionCheckpointStore(provider, scope);

      const loaded = await checkpoints.load(executionId);
      expect(loaded?.stage).toBe('post-invoke');
      expect(loaded?.capabilityResult).toEqual({ durable: true, n: 7 });

      const incomplete = await checkpoints.listIncomplete({ limit: 100 });
      expect(incomplete.some((item) => item.executionId === executionId)).toBe(true);

      const { runtime, invoke } = orchestrator(checkpoints);
      const result = await runtime.recoverIncomplete({ now: new Date() });
      expect(
        result.outcomes.some((o) => o.executionId === executionId && o.kind === 'resumed-completed'),
      ).toBe(true);
      expect(invoke).not.toHaveBeenCalled();

      const terminal = await checkpoints.load(executionId);
      expect(terminal?.terminal).toBe(true);
      expect(terminal?.state).toBe('completed');
      expect(terminal?.capabilityResult).toEqual({ durable: true, n: 7 });

      const after = await checkpoints.listIncomplete({ limit: 100 });
      expect(after.some((item) => item.executionId === executionId)).toBe(false);

      if (loaded === undefined) throw new Error('expected loaded checkpoint');
      await expect(
        checkpoints.store({
          ...loaded,
          state: 'failed',
          stage: 'terminal',
          terminal: true,
          updatedAt: new Date().toISOString(),
        }),
      ).rejects.toMatchObject({ name: 'CheckpointConflictError' });
    });
  },
);
