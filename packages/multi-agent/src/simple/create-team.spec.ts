import { describe, expect, it, vi } from 'vitest';
import { createTeam, handoff, TeamError, type TeamMember, type TeamMemberResult } from './index.js';

function member(
  name: string,
  impl: (input: string) => Promise<TeamMemberResult> | TeamMemberResult,
): TeamMember {
  return {
    invoke: async (input: string) => {
      const result = await impl(input);
      return { text: result.text, output: result.output, executionId: `exec:${name}` };
    },
  };
}

describe('createTeam config', () => {
  it('requires at least two agents', () => {
    expect(() =>
      createTeam({
        agents: { only: member('only', async () => ({ text: 'x' })) },
        strategy: 'sequential',
      }),
    ).toThrowError(TeamError);
  });
});

describe('sequential strategy', () => {
  it('runs A -> B -> C and threads outputs', async () => {
    const order: string[] = [];
    const team = createTeam({
      name: 'seq-team',
      agents: {
        a: member('a', async (input) => {
          order.push('a');
          return { text: `A:${input}` };
        }),
        b: member('b', async (input) => {
          order.push('b');
          return { text: `B:${input}` };
        }),
        c: member('c', async (input) => {
          order.push('c');
          return { text: `C:${input}` };
        }),
      },
      strategy: 'sequential',
    });

    const result = await team.run('goal');
    expect(order).toEqual(['a', 'b', 'c']);
    expect(result.status).toBe('completed');
    expect(result.text).toBe('C:B:A:goal');
    expect(result.agentOutputs.a?.text).toBe('A:goal');
    expect(result.events.some((e) => e.type === 'orchestration.started')).toBe(true);
    expect(result.events.some((e) => e.type === 'orchestration.completed')).toBe(true);
  });
});

describe('parallel strategy', () => {
  it('runs all agents and aggregates results', async () => {
    const team = createTeam({
      agents: {
        a: member('a', async () => ({ text: 'ra' })),
        b: member('b', async () => ({ text: 'rb' })),
        c: member('c', async () => ({ text: 'rc' })),
      },
      strategy: 'parallel',
      failurePolicy: 'continue',
    });
    const result = await team.run('topic');
    expect(result.status).toBe('completed');
    expect(result.agentOutputs.a?.text).toBe('ra');
    expect(result.agentOutputs.b?.text).toBe('rb');
    expect(result.agentOutputs.c?.text).toBe('rc');
    expect(result.text).toContain('[a] ra');
  });

  it('honors fail-fast when one agent fails', async () => {
    const team = createTeam({
      agents: {
        ok: member('ok', async () => {
          await new Promise((r) => setTimeout(r, 20));
          return { text: 'ok' };
        }),
        bad: member('bad', async () => {
          throw new Error('boom');
        }),
      },
      strategy: 'parallel',
      failurePolicy: 'fail-fast',
    });
    const result = await team.run('x');
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/boom/);
  });

  it('best-effort keeps successful sibling results', async () => {
    const team = createTeam({
      agents: {
        ok: member('ok', async () => ({ text: 'ok' })),
        bad: member('bad', async () => {
          throw new Error('nope');
        }),
      },
      strategy: 'parallel',
      failurePolicy: 'best-effort',
    });
    const result = await team.run('x');
    expect(result.status).toBe('partial');
    expect(result.agentOutputs.ok?.text).toBe('ok');
    expect(result.error).toMatch(/nope/);
  });
});

describe('supervisor strategy', () => {
  it('delegates then finishes via structured decisions', async () => {
    const team = createTeam({
      agents: {
        researcher: member('researcher', async (input) => ({ text: `research:${input}` })),
        analyst: member('analyst', async () => ({ text: 'unused' })),
      },
      strategy: 'supervisor',
      supervisor: 'analyst',
      supervisorDecide: ({ iteration, agentOutputs }) => {
        if (iteration === 1) {
          return { action: 'delegate', agent: 'researcher', task: 'competitors' };
        }
        expect(agentOutputs.researcher?.text).toBe('research:competitors');
        return { action: 'finish', output: 'final-analysis' };
      },
    });
    const result = await team.run('Should we expand?');
    expect(result.status).toBe('completed');
    expect(result.text).toBe('final-analysis');
    expect(result.events.filter((e) => e.type === 'supervisor.decision')).toHaveLength(2);
  });
});

describe('handoff', () => {
  it('routes from A to B when A returns a handoff marker', async () => {
    const team = createTeam({
      agents: {
        a: member('a', async () => ({
          text: handoff({ to: 'b', reason: 'billing', input: 'invoice-42' }),
        })),
        b: member('b', async (input) => ({ text: `handled:${input}` })),
      },
      strategy: 'sequential',
      order: ['a', 'b'],
    });
    const result = await team.run('help');
    expect(result.agentOutputs.b?.text).toBe('handled:invoice-42');
    expect(result.events.some((e) => e.type === 'handoff.requested')).toBe(true);
    expect(result.events.some((e) => e.type === 'handoff.completed')).toBe(true);
  });
});

describe('cancellation', () => {
  it('marks the run cancelled when cancel() is called', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const team = createTeam({
      agents: {
        a: member('a', async () => {
          await gate;
          return { text: 'a' };
        }),
        b: member('b', async () => ({ text: 'b' })),
      },
      strategy: 'sequential',
    });
    const pending = team.run('x');
    await Promise.resolve();
    team.cancel();
    release();
    const result = await pending;
    expect(result.status).toBe('cancelled');
    expect(team.getState().status).toBe('cancelled');
  });

  it('respects AbortSignal', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const controller = new AbortController();
    const team = createTeam({
      agents: {
        a: member('a', async () => {
          await gate;
          return { text: 'a' };
        }),
        b: member('b', async () => ({ text: 'b' })),
      },
      strategy: 'sequential',
    });
    const pending = team.run('x', { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    release();
    const result = await pending;
    expect(result.status).toBe('cancelled');
  });
});

describe('events', () => {
  it('forwards events to onEvent', async () => {
    const onEvent = vi.fn();
    const team = createTeam({
      agents: {
        a: member('a', async () => ({ text: 'a' })),
        b: member('b', async () => ({ text: 'b' })),
      },
      strategy: 'sequential',
      onEvent,
    });
    await team.run('x');
    expect(onEvent.mock.calls.length).toBeGreaterThan(3);
  });
});
