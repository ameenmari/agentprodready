import { TeamError } from './errors.js';
import { parseHandoff } from './handoff.js';
import type {
  AgentTask,
  HandoffRequest,
  OrchestrationContext,
  TeamMemberResult,
} from './types.js';

export interface InvokeAgentOutcome {
  readonly task: AgentTask;
  readonly result?: TeamMemberResult;
  readonly handoff?: HandoffRequest;
  readonly error?: string;
}

export async function invokeAgent(options: {
  readonly context: OrchestrationContext;
  readonly agentId: string;
  readonly input: string;
  readonly title?: string;
  readonly dependsOn?: readonly string[];
}): Promise<InvokeAgentOutcome> {
  const { context, agentId, input, title, dependsOn } = options;
  context.ensureNotCancelled();
  const agent = context.agents[agentId];
  if (agent === undefined) {
    throw new TeamError('TEAM_AGENT_MISSING', `Unknown team agent: ${agentId}`);
  }

  const taskId = context.createTaskId(agentId);
  const at = (): string => new Date().toISOString();

  context.emit({
    type: 'task.created',
    runId: context.runId,
    teamId: context.teamId,
    taskId,
    agentId,
    at: at(),
  });
  context.emit({
    type: 'task.assigned',
    runId: context.runId,
    teamId: context.teamId,
    taskId,
    agentId,
    at: at(),
  });
  context.emit({
    type: 'agent.started',
    runId: context.runId,
    teamId: context.teamId,
    agentId,
    taskId,
    at: at(),
  });

  const baseTask: AgentTask = {
    id: taskId,
    ...(title === undefined ? {} : { title }),
    input,
    assignedTo: agentId,
    ...(dependsOn === undefined ? {} : { dependsOn }),
    status: 'running',
  };

  try {
    const result = await agent.invoke(input);
    context.ensureNotCancelled();
    const handoff = parseHandoff(result.output) ?? parseHandoff(result.text);
    if (handoff !== undefined) {
      context.emit({
        type: 'handoff.requested',
        runId: context.runId,
        teamId: context.teamId,
        fromAgent: agentId,
        toAgent: handoff.to,
        reason: handoff.reason,
        taskId,
        at: at(),
      });
    }
    context.emit({
      type: 'agent.completed',
      runId: context.runId,
      teamId: context.teamId,
      agentId,
      taskId,
      at: at(),
    });
    context.emit({
      type: 'task.completed',
      runId: context.runId,
      teamId: context.teamId,
      taskId,
      agentId,
      at: at(),
    });
    return {
      task: { ...baseTask, status: 'completed', result },
      result,
      ...(handoff === undefined ? {} : { handoff }),
    };
  } catch (error) {
    if (error instanceof TeamError && error.code === 'TEAM_CANCELLED') {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    context.emit({
      type: 'agent.failed',
      runId: context.runId,
      teamId: context.teamId,
      agentId,
      taskId,
      error: message,
      at: at(),
    });
    context.emit({
      type: 'task.failed',
      runId: context.runId,
      teamId: context.teamId,
      taskId,
      agentId,
      error: message,
      at: at(),
    });
    return {
      task: { ...baseTask, status: 'failed', error: message },
      error: message,
    };
  }
}

export async function fulfillHandoff(
  context: OrchestrationContext,
  fromAgent: string,
  handoff: HandoffRequest,
  parentTaskId: string,
): Promise<InvokeAgentOutcome> {
  if (context.agents[handoff.to] === undefined) {
    throw new TeamError(
      'TEAM_HANDOFF_FAILED',
      `Handoff target agent not in team: ${handoff.to}`,
    );
  }
  const input = handoff.input ?? context.input;
  const outcome = await invokeAgent({
    context,
    agentId: handoff.to,
    input,
    title: `handoff:${fromAgent}->${handoff.to}`,
    dependsOn: [parentTaskId],
  });
  context.emit({
    type: 'handoff.completed',
    runId: context.runId,
    teamId: context.teamId,
    fromAgent,
    toAgent: handoff.to,
    taskId: outcome.task.id,
    at: new Date().toISOString(),
  });
  return outcome;
}
