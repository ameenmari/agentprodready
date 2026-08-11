import { TeamError } from '../errors.js';
import { fulfillHandoff, invokeAgent } from '../invoke-agent.js';
import type {
  AgentTask,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationStrategy,
  TeamMemberResult,
} from '../types.js';

export class ParallelStrategy implements OrchestrationStrategy {
  public readonly name = 'parallel' as const;

  public async execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    const agentOutputs: Record<string, TeamMemberResult> = {};
    const tasks: AgentTask[] = [];
    const errors: string[] = [];

    if (context.failurePolicy === 'fail-fast') {
      const controller = new AbortController();
      const onAbort = (): void => {
        controller.abort();
      };
      context.signal?.addEventListener('abort', onAbort, { once: true });
      try {
        const settlements = await Promise.all(
          context.order.map(async (agentId) => {
            if (controller.signal.aborted || context.signal?.aborted) {
              throw new TeamError('TEAM_CANCELLED', 'Team run cancelled');
            }
            const outcome = await invokeAgent({
              context,
              agentId,
              input: context.input,
              title: `parallel:${agentId}`,
            });
            if (outcome.error !== undefined) {
              controller.abort();
              throw new TeamError('TEAM_AGENT_FAILED', outcome.error);
            }
            return { agentId, outcome };
          }),
        );

        for (const { agentId, outcome } of settlements) {
          tasks.push(outcome.task);
          if (outcome.result !== undefined) {
            agentOutputs[agentId] = outcome.result;
          }
          if (outcome.handoff !== undefined) {
            const handed = await fulfillHandoff(
              context,
              agentId,
              outcome.handoff,
              outcome.task.id,
            );
            tasks.push(handed.task);
            if (handed.error !== undefined) {
              return {
                status: 'failed',
                text: aggregateText(agentOutputs),
                agentOutputs,
                tasks,
                error: handed.error,
              };
            }
            if (handed.result !== undefined) {
              agentOutputs[outcome.handoff.to] = handed.result;
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          status: 'failed',
          text: aggregateText(agentOutputs),
          agentOutputs,
          tasks,
          error: message,
        };
      } finally {
        context.signal?.removeEventListener('abort', onAbort);
      }

      return {
        status: 'completed',
        text: aggregateText(agentOutputs),
        output: { ...agentOutputs },
        agentOutputs,
        tasks,
      };
    }

    const settlements = await Promise.all(
      context.order.map(async (agentId) => {
        context.ensureNotCancelled();
        const outcome = await invokeAgent({
          context,
          agentId,
          input: context.input,
          title: `parallel:${agentId}`,
        });
        return { agentId, outcome };
      }),
    );

    for (const { agentId, outcome } of settlements) {
      tasks.push(outcome.task);
      if (outcome.error !== undefined) {
        errors.push(`${agentId}: ${outcome.error}`);
        continue;
      }
      if (outcome.result !== undefined) {
        agentOutputs[agentId] = outcome.result;
      }
      if (outcome.handoff !== undefined) {
        const handed = await fulfillHandoff(
          context,
          agentId,
          outcome.handoff,
          outcome.task.id,
        );
        tasks.push(handed.task);
        if (handed.error !== undefined) {
          errors.push(`${outcome.handoff.to}: ${handed.error}`);
        } else if (handed.result !== undefined) {
          agentOutputs[outcome.handoff.to] = handed.result;
        }
      }
    }

    if (errors.length === 0) {
      return {
        status: 'completed',
        text: aggregateText(agentOutputs),
        output: { ...agentOutputs },
        agentOutputs,
        tasks,
      };
    }

    if (context.failurePolicy === 'best-effort' && Object.keys(agentOutputs).length > 0) {
      return {
        status: 'partial',
        text: aggregateText(agentOutputs),
        output: { ...agentOutputs },
        agentOutputs,
        tasks,
        error: errors.join('; '),
      };
    }

    return {
      status: 'failed',
      text: aggregateText(agentOutputs),
      agentOutputs,
      tasks,
      error: errors.join('; '),
    };
  }
}

function aggregateText(outputs: Readonly<Record<string, TeamMemberResult>>): string {
  return Object.entries(outputs)
    .map(([id, result]) => `[${id}] ${result.text}`)
    .join('\n');
}
