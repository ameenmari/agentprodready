import { fulfillHandoff, invokeAgent } from '../invoke-agent.js';
import type {
  AgentTask,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationStrategy,
  TeamMemberResult,
} from '../types.js';

export class SequentialStrategy implements OrchestrationStrategy {
  public readonly name = 'sequential' as const;

  public async execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    const agentOutputs: Record<string, TeamMemberResult> = {};
    const tasks: AgentTask[] = [];
    const completed = new Set<string>();
    let currentInput = context.input;
    let previousTaskId: string | undefined;
    let lastText = '';

    for (const agentId of context.order) {
      if (completed.has(agentId)) continue;
      context.ensureNotCancelled();
      const outcome = await invokeAgent({
        context,
        agentId,
        input: currentInput,
        title: `sequential:${agentId}`,
        ...(previousTaskId === undefined ? {} : { dependsOn: [previousTaskId] }),
      });
      tasks.push(outcome.task);
      previousTaskId = outcome.task.id;
      completed.add(agentId);

      if (outcome.error !== undefined) {
        return {
          status: 'failed',
          text: lastText,
          agentOutputs,
          tasks,
          error: outcome.error,
        };
      }

      if (outcome.result !== undefined) {
        agentOutputs[agentId] = outcome.result;
        lastText = outcome.result.text;
        currentInput = outcome.result.text;
      }

      if (outcome.handoff !== undefined) {
        const handed = await fulfillHandoff(
          context,
          agentId,
          outcome.handoff,
          outcome.task.id,
        );
        tasks.push(handed.task);
        previousTaskId = handed.task.id;
        completed.add(outcome.handoff.to);
        if (handed.error !== undefined) {
          return {
            status: 'failed',
            text: lastText,
            agentOutputs,
            tasks,
            error: handed.error,
          };
        }
        if (handed.result !== undefined) {
          agentOutputs[outcome.handoff.to] = handed.result;
          lastText = handed.result.text;
          currentInput = handed.result.text;
        }
      }
    }

    return {
      status: 'completed',
      text: lastText,
      output: lastText,
      agentOutputs,
      tasks,
    };
  }
}
