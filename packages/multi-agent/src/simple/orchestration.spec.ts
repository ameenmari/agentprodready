import { describe, expect, it } from 'vitest';
import {
  createOrchestrator,
  createTeam,
  createWorkflow,
  InMemoryCheckpointStore,
  InMemoryEffectLedger,
  runEffect,
  type TeamMember,
  type TeamMemberResult,
} from './index.js';

function member(
  name: string,
  impl: (input: string) => Promise<TeamMemberResult> | TeamMemberResult,
): TeamMember {
  return {
    invoke: async (input: string): Promise<TeamMemberResult> => {
      const result = await impl(input);
      return { text: result.text, executionId: `exec:${name}` };
    },
  };
}

describe('extended strategies', () => {
  it('consensus picks majority text', async () => {
    const team = createTeam({
      agents: {
        a: member('a', async () => ({ text: 'yes' })),
        b: member('b', async () => ({ text: 'yes' })),
        c: member('c', async () => ({ text: 'no' })),
      },
      strategy: 'consensus',
    });
    const result = await team.run('vote');
    expect(result.status).toBe('completed');
    expect(result.text).toBe('yes');
  });

  it('debate-review synthesizes after parallel debate', async () => {
    const team = createTeam({
      agents: {
        a: member('a', async () => ({ text: 'point-a' })),
        b: member('b', async () => ({ text: 'point-b' })),
        reviewer: member('reviewer', async (input) => ({
          text: `reviewed:${String(input.includes('point-a'))}`,
        })),
      },
      strategy: 'debate-review',
      supervisor: 'reviewer',
    });
    const result = await team.run('topic');
    expect(result.status).toBe('completed');
    expect(result.text).toContain('reviewed:true');
  });

  it('dynamic-assignment fans out then finishes', async () => {
    const team = createTeam({
      agents: {
        lead: member('lead', async () => ({ text: 'lead' })),
        w1: member('w1', async (input) => ({ text: `w1:${input}` })),
        w2: member('w2', async (input) => ({ text: `w2:${input}` })),
      },
      strategy: 'dynamic-assignment',
      supervisor: 'lead',
    });
    const result = await team.run('job');
    expect(result.status).toBe('completed');
    expect(result.agentOutputs.w1?.text).toBe('w1:job');
    expect(result.agentOutputs.w2?.text).toBe('w2:job');
  });
});

describe('createWorkflow', () => {
  it('runs dependency order A -> B', async () => {
    const order: string[] = [];
    const workflow = createWorkflow({
      name: 'dep',
      steps: [
        {
          id: 'a',
          run: member('a', async (input) => {
            order.push('a');
            return { text: `A:${input}` };
          }),
        },
        {
          id: 'b',
          dependsOn: ['a'],
          run: member('b', async (input) => {
            order.push('b');
            return { text: `B:${input}` };
          }),
        },
      ],
    });
    const result = await workflow.run('goal');
    expect(order).toEqual(['a', 'b']);
    expect(result.status).toBe('completed');
    expect(result.text).toBe('B:A:goal');
  });

  it('fans out independent root steps in parallel', async () => {
    const workflow = createWorkflow({
      steps: [
        { id: 'a', run: member('a', async () => ({ text: 'ra' })) },
        { id: 'b', run: member('b', async () => ({ text: 'rb' })) },
      ],
    });
    const result = await workflow.run('x');
    expect(result.status).toBe('completed');
    expect(result.stepOutputs.a).toBe('ra');
    expect(result.stepOutputs.b).toBe('rb');
  });

  it('resumes from checkpoint without re-running completed steps', async () => {
    const store = new InMemoryCheckpointStore();
    let aCalls = 0;
    const steps = [
      {
        id: 'a',
        run: member('a', async () => {
          aCalls += 1;
          return { text: 'done-a' };
        }),
      },
      {
        id: 'b',
        dependsOn: ['a'] as const,
        run: member('b', async () => ({ text: 'done-b' })),
      },
    ];
    const workflow = createWorkflow({
      name: 'durable',
      checkpointStore: store,
      steps,
    });

    const first = await workflow.run('x');
    expect(first.status).toBe('completed');
    expect(aCalls).toBe(1);

    const saved = await store.load(first.runId);
    expect(saved).toBeTruthy();
    if (saved === undefined) {
      throw new Error('expected checkpoint');
    }
    await store.save({
      ...saved,
      status: 'running',
      completedSteps: ['a'],
      stepOutputs: { a: 'done-a' },
      currentStep: 'a',
      updatedAt: new Date().toISOString(),
    });

    const before = aCalls;
    const resumed = await workflow.resume(first.runId);
    expect(resumed.status).toBe('completed');
    expect(resumed.text).toBe('done-b');
    expect(aCalls).toBe(before);
  });

  it('pauses for approval and resumes after approve', async () => {
    const workflow = createWorkflow({
      steps: [
        {
          id: 'refund',
          run: member('refund', async () => ({ text: 'refunded' })),
          approval: {
            requiredWhen: ({ input }): boolean => input.includes('large'),
          },
        },
      ],
    });
    const waiting = await workflow.run('large refund');
    expect(waiting.status).toBe('waiting');
    expect(waiting.approvalId).toBeTruthy();
    if (waiting.approvalId === undefined) {
      throw new Error('expected approvalId');
    }
    const done = await workflow.approve(waiting.runId, {
      approvalId: waiting.approvalId,
      approved: true,
      approvedBy: 'user-1',
    });
    expect(done.status).toBe('completed');
    expect(done.text).toBe('refunded');
  });
});

describe('createOrchestrator', () => {
  it('runs agent, team, and workflow targets', async () => {
    const orch = createOrchestrator();
    const agent = member('solo', async (input) => ({ text: `echo:${input}` }));
    const agentRun = await orch.run(agent, 'hi');
    expect(agentRun.type).toBe('agent');
    expect(agentRun.output).toBe('echo:hi');

    const team = createTeam({
      agents: {
        a: member('a', async (i) => ({ text: i })),
        b: member('b', async (i) => ({ text: i })),
      },
      strategy: 'sequential',
    });
    const teamRun = await orch.run(team, 't');
    expect(teamRun.type).toBe('team');
    expect(teamRun.status).toBe('completed');

    const workflow = createWorkflow({
      steps: [{ id: 's', run: member('s', async () => ({ text: 'w' })) }],
    });
    const wfRun = await orch.run(workflow, 'x');
    expect(wfRun.type).toBe('workflow');
    expect(wfRun.output).toBe('w');
  });
});

describe('effect ledger', () => {
  it('does not re-execute completed idempotent effects', async () => {
    const ledger = new InMemoryEffectLedger();
    let calls = 0;
    const first = await runEffect(
      ledger,
      { runId: 'r1', stepId: 's1', operation: 'sendPayment', idempotencyKey: 'r1:s1:pay' },
      async () => {
        calls += 1;
        return { ok: true };
      },
    );
    const second = await runEffect(
      ledger,
      { runId: 'r1', stepId: 's1', operation: 'sendPayment', idempotencyKey: 'r1:s1:pay' },
      async () => {
        calls += 1;
        return { ok: true };
      },
    );
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(calls).toBe(1);
    expect(second.result).toEqual({ ok: true });
  });
});
