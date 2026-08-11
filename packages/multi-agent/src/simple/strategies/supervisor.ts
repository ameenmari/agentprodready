import { TeamError } from '../errors.js';
import { fulfillHandoff, invokeAgent } from '../invoke-agent.js';
import type {
  AgentTask,
  OrchestrationContext,
  OrchestrationResult,
  OrchestrationStrategy,
  SupervisorDecision,
  TeamMemberResult,
} from '../types.js';

export class SupervisorStrategy implements OrchestrationStrategy {
  public readonly name = 'supervisor' as const;

  public async execute(context: OrchestrationContext): Promise<OrchestrationResult> {
    const supervisorId = context.supervisorId;
    if (supervisorId === undefined || context.agents[supervisorId] === undefined) {
      throw new TeamError(
        'TEAM_INVALID_CONFIG',
        'supervisor strategy requires a valid supervisor agent id',
      );
    }

    const agentOutputs: Record<string, TeamMemberResult> = {};
    const tasks: AgentTask[] = [];
    let lastText = '';

    for (let iteration = 1; iteration <= context.maxIterations; iteration += 1) {
      context.ensureNotCancelled();
      const decision = await resolveSupervisorDecision(context, agentOutputs, iteration);
      context.emit({
        type: 'supervisor.decision',
        runId: context.runId,
        teamId: context.teamId,
        decision,
        iteration,
        at: new Date().toISOString(),
      });

      if (decision.action === 'finish') {
        return {
          status: 'completed',
          text: decision.output,
          output: decision.output,
          agentOutputs,
          tasks,
        };
      }

      if (decision.action === 'delegate') {
        const outcome = await invokeAgent({
          context,
          agentId: decision.agent,
          input: decision.task,
          title: `supervisor-delegate:${decision.agent}`,
        });
        tasks.push(outcome.task);
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
          agentOutputs[decision.agent] = outcome.result;
          lastText = outcome.result.text;
        }
        if (outcome.handoff !== undefined) {
          const handed = await fulfillHandoff(
            context,
            decision.agent,
            outcome.handoff,
            outcome.task.id,
          );
          tasks.push(handed.task);
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
          }
        }
        continue;
      }

      // parallel
      const settlements = await Promise.all(
        decision.tasks.map(async (item) => {
          const outcome = await invokeAgent({
            context,
            agentId: item.agent,
            input: item.task,
            title: `supervisor-parallel:${item.agent}`,
          });
          return { agent: item.agent, outcome };
        }),
      );

      for (const { agent, outcome } of settlements) {
        tasks.push(outcome.task);
        if (outcome.error !== undefined) {
          if (context.failurePolicy === 'fail-fast') {
            return {
              status: 'failed',
              text: lastText,
              agentOutputs,
              tasks,
              error: outcome.error,
            };
          }
          continue;
        }
        if (outcome.result !== undefined) {
          agentOutputs[agent] = outcome.result;
          lastText = outcome.result.text;
        }
      }
    }

    return {
      status: 'failed',
      text: lastText,
      agentOutputs,
      tasks,
      error: `Supervisor exceeded maxIterations (${String(context.maxIterations)})`,
    };
  }
}

async function resolveSupervisorDecision(
  context: OrchestrationContext,
  agentOutputs: Readonly<Record<string, TeamMemberResult>>,
  iteration: number,
): Promise<SupervisorDecision> {
  if (context.supervisorDecide !== undefined) {
    const decision = await context.supervisorDecide({
      runId: context.runId,
      teamId: context.teamId,
      input: context.input,
      iteration,
      history: context.history,
      agentOutputs,
      sharedContext: context.sharedContext,
    });
    return validateSupervisorDecision(decision, context);
  }

  const supervisorId = context.supervisorId;
  if (supervisorId === undefined) {
    throw new TeamError('TEAM_INVALID_CONFIG', 'supervisor strategy requires a valid supervisor agent id');
  }
  const prompt = buildSupervisorPrompt(context, agentOutputs, iteration);
  const outcome = await invokeAgent({
    context,
    agentId: supervisorId,
    input: prompt,
    title: `supervisor-decide:${String(iteration)}`,
  });
  if (outcome.error !== undefined || outcome.result === undefined) {
    throw new TeamError(
      'TEAM_SUPERVISOR_INVALID',
      outcome.error ?? 'Supervisor agent returned no result',
    );
  }
  const parsed = parseSupervisorDecisionText(outcome.result.text);
  return validateSupervisorDecision(parsed, context);
}

function buildSupervisorPrompt(
  context: OrchestrationContext,
  agentOutputs: Readonly<Record<string, TeamMemberResult>>,
  iteration: number,
): string {
  const workers = context.order.filter((id) => id !== context.supervisorId);
  return [
    'You are the team supervisor. Reply with a single JSON object only.',
    'Allowed actions:',
    '{"action":"delegate","agent":"<id>","task":"<string>"}',
    '{"action":"parallel","tasks":[{"agent":"<id>","task":"<string>"}]}',
    '{"action":"finish","output":"<final string>"}',
    `Objective: ${context.input}`,
    `Iteration: ${String(iteration)}`,
    `Workers: ${workers.join(', ')}`,
    `Completed outputs: ${JSON.stringify(agentOutputs)}`,
  ].join('\n');
}

function parseSupervisorDecisionText(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new TeamError('TEAM_SUPERVISOR_INVALID', 'Supervisor response was not JSON');
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  } catch (error) {
    throw new TeamError('TEAM_SUPERVISOR_INVALID', 'Supervisor JSON parse failed', error);
  }
}

function validateSupervisorDecision(
  decision: unknown,
  context: Pick<OrchestrationContext, 'agents'>,
): SupervisorDecision {
  if (typeof decision !== 'object' || decision === null || !('action' in decision)) {
    throw new TeamError('TEAM_SUPERVISOR_INVALID', 'Invalid supervisor decision shape');
  }
  const record = decision as Record<string, unknown>;
  if (record.action === 'finish') {
    if (typeof record.output !== 'string') {
      throw new TeamError('TEAM_SUPERVISOR_INVALID', 'finish requires string output');
    }
    return { action: 'finish', output: record.output };
  }
  if (record.action === 'delegate') {
    if (typeof record.agent !== 'string' || typeof record.task !== 'string') {
      throw new TeamError('TEAM_SUPERVISOR_INVALID', 'delegate requires agent and task');
    }
    if (context.agents[record.agent] === undefined) {
      throw new TeamError('TEAM_SUPERVISOR_INVALID', `Unknown delegate agent: ${record.agent}`);
    }
    return { action: 'delegate', agent: record.agent, task: record.task };
  }
  if (record.action === 'parallel') {
    if (!Array.isArray(record.tasks) || record.tasks.length === 0) {
      throw new TeamError('TEAM_SUPERVISOR_INVALID', 'parallel requires non-empty tasks');
    }
    const tasks: Array<{ agent: string; task: string }> = [];
    for (const item of record.tasks) {
      if (typeof item !== 'object' || item === null) {
        throw new TeamError('TEAM_SUPERVISOR_INVALID', 'parallel tasks require agent and task');
      }
      const taskRecord = item as Record<string, unknown>;
      if (typeof taskRecord.agent !== 'string' || typeof taskRecord.task !== 'string') {
        throw new TeamError('TEAM_SUPERVISOR_INVALID', 'parallel tasks require agent and task');
      }
      if (context.agents[taskRecord.agent] === undefined) {
        throw new TeamError('TEAM_SUPERVISOR_INVALID', `Unknown parallel agent: ${taskRecord.agent}`);
      }
      tasks.push({ agent: taskRecord.agent, task: taskRecord.task });
    }
    return { action: 'parallel', tasks };
  }
  throw new TeamError('TEAM_SUPERVISOR_INVALID', 'Unknown supervisor action');
}
