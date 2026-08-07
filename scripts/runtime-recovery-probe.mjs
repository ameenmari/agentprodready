#!/usr/bin/env node
/**
 * Manual restart/recovery probe for AgentForge v0.4.
 *
 * Requires: pnpm build && pnpm db:up && pnpm db:migrate
 * Env: DATABASE_URL, PERSISTENCE_PROVIDER=postgres
 *
 * Modes:
 *   write-post-invoke   — persist incomplete post-invoke checkpoint then exit
 *   write-pre-invoke    — persist incomplete pre-invoke checkpoint then exit
 *   write-expired       — persist expired incomplete checkpoint then exit
 *   write-cancelled     — persist cancelled incomplete checkpoint then exit
 *   recover             — open new provider, recoverIncomplete, assert outcomes
 */
import { CompositionRoot } from '../packages/composition/dist/index.js';
import {
  DEFAULT_RECOVERY_POLICY,
  InMemoryRuntimeEventPublisher,
  RuntimeOrchestrator,
  StaticRuntimePolicyProvider,
} from '../packages/runtime/dist/index.js';
import {
  loadPostgresPersistenceConfig,
  PostgresPersistenceProvider,
} from '../packages/persistence-postgres/dist/index.js';
import { PersistenceExecutionCheckpointStore } from '../apps/platform-host/dist/composition/persistence-execution-checkpoint-store.js';

const scope = Object.freeze({
  tenantId: process.env['PROBE_TENANT'] ?? 'probe-tenant',
  workspaceId: process.env['PROBE_WORKSPACE'] ?? 'probe-workspace',
});
const executionId = process.env['PROBE_EXECUTION_ID'] ?? 'probe-execution-1';
const mode = process.argv[2] ?? 'recover';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function withStore(run) {
  const provider = new PostgresPersistenceProvider(loadPostgresPersistenceConfig());
  const checkpoints = new PersistenceExecutionCheckpointStore(provider, scope);
  try {
    await provider.assertReady();
    return await run({ provider, checkpoints });
  } finally {
    await provider.close();
  }
}

function baseCheckpoint(stage, extras = {}) {
  const now = new Date().toISOString();
  const deadlineAt =
    extras.deadlineAt ?? new Date(Date.now() + 120_000).toISOString();
  return Object.freeze({
    executionId,
    state: 'executing',
    stage,
    history: Object.freeze([
      { state: 'created', occurredAt: now },
      { state: 'initializing', occurredAt: now },
      { state: 'planning', occurredAt: now },
      { state: 'executing', occurredAt: now },
    ]),
    attempts: 1,
    maxAttempts: 1,
    startedAt: now,
    deadlineAt,
    timeoutMs: 120_000,
    cancelled: false,
    correlationId: `corr:${executionId}`,
    causationId: null,
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
    input: 'probe-input',
    contextRequest: Object.freeze({
      executionId,
      correlationId: `corr:${executionId}`,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      configurationVersion: 'v1',
      securityContextId: 's1',
    }),
    plan: Object.freeze({ input: 'probe-input' }),
    workflowWork: Object.freeze({ input: 'probe-input' }),
    recoveryPolicy: extras.recoveryPolicy ?? DEFAULT_RECOVERY_POLICY,
    terminal: false,
    checkpointVersion: 1,
    updatedAt: now,
    ...extras,
  });
}

async function write(stage, extras = {}) {
  await withStore(async ({ checkpoints }) => {
    const existing = await checkpoints.load(executionId);
    if (existing !== undefined && !existing.terminal) {
      // overwrite path: load tokens then replace via recover-terminalize first if needed
      console.log(`existing incomplete checkpoint at stage=${existing.stage}; rewriting`);
    }
    const cp = baseCheckpoint(stage, extras);
    if (existing === undefined) {
      await checkpoints.store(cp);
    } else {
      await checkpoints.store({
        ...cp,
        concurrencyRevision: existing.concurrencyRevision,
        concurrencyToken: existing.concurrencyToken,
      });
    }
    const loaded = await checkpoints.load(executionId);
    assert(loaded?.stage === stage, `expected stage ${stage}`);
    console.log(JSON.stringify({ ok: true, mode: `write-${stage}`, executionId, stage }, null, 2));
  });
}

async function recover() {
  let invokeCount = 0;
  await withStore(async ({ checkpoints }) => {
    const before = await checkpoints.load(executionId);
    assert(before !== undefined, 'checkpoint missing before recover');
    const root = new CompositionRoot();
    root.build();
    const runtime = new RuntimeOrchestrator({
      scopes: root,
      policies: new StaticRuntimePolicyProvider({
        timeoutMs: 60_000,
        maxAttempts: 1,
        maxConcurrency: 4,
        isRetryable: () => false,
        recovery: DEFAULT_RECOVERY_POLICY,
      }),
      planning: {
        plan: async (input) => ({ input }),
      },
      workflow: {
        execute: async (plan) => plan,
      },
      capabilities: {
        invoke: async (work) => {
          invokeCount += 1;
          return work;
        },
      },
      security: {
        authorize: async () => ({ authorized: true, decisionId: 'probe' }),
      },
      events: new InMemoryRuntimeEventPublisher(),
      telemetry: {
        transition() {},
        completed() {},
        failed() {},
        recovery() {},
      },
      checkpoints,
    });

    const result = await runtime.recoverIncomplete({ now: new Date() });
    const after = await checkpoints.load(executionId);
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'recover',
          executionId,
          beforeStage: before.stage,
          afterState: after?.state,
          afterTerminal: after?.terminal,
          invokeCount,
          result,
        },
        null,
        2,
      ),
    );

    if (before.stage === 'post-invoke') {
      assert(invokeCount === 0, 'post-invoke recovery must not re-invoke');
      assert(after?.state === 'completed', 'expected completed');
      assert(
        JSON.stringify(after?.capabilityResult) === JSON.stringify(before.capabilityResult),
        'capabilityResult must be restored',
      );
    }
    if (before.stage === 'pre-invoke' && before.recoveryPolicy.onRestart === 'resume-if-safe') {
      assert(invokeCount === 0, 'ResumeIfSafe pre-invoke must not invoke');
      assert(after?.state === 'failed', 'expected failed');
    }
    if (before.cancelled) {
      assert(after?.state === 'cancelled', 'expected cancelled');
      assert(invokeCount === 0, 'cancelled must not invoke');
    }
    if (Date.parse(before.deadlineAt) <= Date.now() && before.recoveryPolicy.failIfExpired) {
      assert(after?.state === 'failed', 'expected timeout failed');
      assert(invokeCount === 0, 'expired must not invoke');
    }
  });
}

if (mode === 'write-post-invoke') {
  await write('post-invoke', {
    capabilityResult: Object.freeze({ probe: true, value: 99 }),
  });
} else if (mode === 'write-pre-invoke') {
  await write('pre-invoke');
} else if (mode === 'write-expired') {
  await write('post-workflow', {
    deadlineAt: new Date(Date.now() - 1_000).toISOString(),
  });
} else if (mode === 'write-cancelled') {
  await write('post-workflow', {
    cancelled: true,
    cancellationReason: 'probe',
  });
} else if (mode === 'recover') {
  await recover();
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
