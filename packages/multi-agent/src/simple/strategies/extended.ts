import { fulfillHandoff, invokeAgent } from '../invoke-agent.js';
import type {
  AgentTask,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationStrategy,
  TeamMemberResult,
} from '../types.js';
import { ParallelStrategy } from './parallel.js';
import { SupervisorStrategy } from './supervisor.js';

/**
 * Hierarchical: run a top-level supervisor loop, treating non-supervisor agents as a subordinate pool.
 * Reuses SupervisorStrategy decision protocol.
 */
export class HierarchicalStrategy implements OrchestrationStrategy {
  public readonly name = 'hierarchical' as const;
  readonly #inner = new SupervisorStrategy();

  public execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    return this.#inner.execute(context);
  }
}

/**
 * Dynamic assignment: supervisor (or supervisorDecide) assigns work from the agent pool each iteration.
 */
export class DynamicAssignmentStrategy implements OrchestrationStrategy {
  public readonly name = 'dynamic-assignment' as const;
  readonly #inner = new SupervisorStrategy();

  public execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    return this.#inner.execute({
      ...context,
      supervisorDecide:
        context.supervisorDecide ??
        (async ({ agentOutputs, input }) => {
          const workers = context.order.filter((id) => id !== context.supervisorId);
          const pending = workers.filter((id) => agentOutputs[id] === undefined);
          if (pending.length === 0) {
            const last = Object.values(agentOutputs).at(-1);
            return { action: 'finish', output: last?.text ?? input };
          }
          if (pending.length > 1) {
            return {
              action: 'parallel',
              tasks: pending.map((agent) => ({ agent, task: input })),
            };
          }
          return { action: 'delegate', agent: pending[0]!, task: input };
        }),
    });
  }
}

/**
 * Debate-review: workers debate in parallel, then a designated reviewer synthesizes.
 * Uses supervisor id as reviewer when set; otherwise the last agent in order.
 */
export class DebateReviewStrategy implements OrchestrationStrategy {
  public readonly name = 'debate-review' as const;

  public async execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    const reviewerId = context.supervisorId ?? context.order.at(-1);
    if (reviewerId === undefined) {
      return {
        status: 'failed',
        text: '',
        agentOutputs: {},
        tasks: [],
        error: 'debate-review requires at least one agent',
      };
    }
    const debaters = context.order.filter((id) => id !== reviewerId);
    const parallel = new ParallelStrategy();
    const debateContext: OrchestrationContext = {
      ...context,
      order: debaters.length > 0 ? debaters : context.order,
    };
    const debate = await parallel.execute(debateContext);
    if (debate.status === 'failed' && context.failurePolicy === 'fail-fast') {
      return debate;
    }

    const synthesisInput = [
      `Original objective: ${context.input}`,
      'Debate outputs:',
      ...Object.entries(debate.agentOutputs).map(([id, result]) => `- ${id}: ${result.text}`),
      'Produce the final reviewed answer.',
    ].join('\n');

    const review = await invokeAgent({
      context,
      agentId: reviewerId,
      input: synthesisInput,
      title: 'debate-review:reviewer',
    });
    const tasks: AgentTask[] = [...debate.tasks, review.task];
    const agentOutputs: Record<string, TeamMemberResult> = { ...debate.agentOutputs };
    if (review.error !== undefined) {
      return {
        status: 'failed',
        text: debate.text,
        agentOutputs,
        tasks,
        error: review.error,
      };
    }
    if (review.result !== undefined) {
      agentOutputs[reviewerId] = review.result;
    }
    if (review.handoff !== undefined) {
      const handed = await fulfillHandoff(context, reviewerId, review.handoff, review.task.id);
      tasks.push(handed.task);
      if (handed.result !== undefined) {
        agentOutputs[review.handoff.to] = handed.result;
        return {
          status: 'completed',
          text: handed.result.text,
          output: handed.result.text,
          agentOutputs,
          tasks,
        };
      }
    }
    return {
      status: 'completed',
      text: review.result?.text ?? debate.text,
      output: review.result?.text ?? debate.text,
      agentOutputs,
      tasks,
    };
  }
}

/**
 * Consensus: all agents answer in parallel; majority text wins (tie → concatenated partial).
 */
export class ConsensusStrategy implements OrchestrationStrategy {
  public readonly name = 'consensus' as const;

  public async execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    const parallel = new ParallelStrategy();
    const result = await parallel.execute({
      ...context,
      failurePolicy: context.failurePolicy === 'fail-fast' ? 'continue' : context.failurePolicy,
    });
    const votes = new Map<string, string[]>();
    for (const [agentId, output] of Object.entries(result.agentOutputs)) {
      const key = output.text.trim();
      const list = votes.get(key) ?? [];
      list.push(agentId);
      votes.set(key, list);
    }
    const ranked = [...votes.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
    const top = ranked[0];
    const second = ranked[1];
    if (top === undefined) {
      return {
        status: 'failed',
        text: '',
        agentOutputs: result.agentOutputs,
        tasks: result.tasks,
        error: result.error ?? 'Consensus failed: no outputs',
      };
    }
    if (second !== undefined && second[1].length === top[1].length) {
      return {
        status: 'partial',
        text: ranked.map(([text, agents]) => `[${agents.join(',')}] ${text}`).join('\n'),
        output: { votes: Object.fromEntries(votes) },
        agentOutputs: result.agentOutputs,
        tasks: result.tasks,
        error: 'Consensus tie',
      };
    }
    return {
      status: 'completed',
      text: top[0],
      output: { selected: top[0], agreeing: top[1], votes: Object.fromEntries(votes) },
      agentOutputs: result.agentOutputs,
      tasks: result.tasks,
    };
  }
}
