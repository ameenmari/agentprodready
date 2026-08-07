import type { PlannedTask, WorkflowCatalog, WorkflowDefinition } from '@agentforge/planning';

/** Returns the catalog workflow for the reference agent single-step plan. */
export class ReferenceWorkflowCatalog implements WorkflowCatalog {
  public find(_objective: string, tasks: readonly PlannedTask[]): WorkflowDefinition | undefined {
    if (tasks.length === 1 && tasks[0]?.id === 'task-1' && tasks[0].capability === 'text-generation') {
      return Object.freeze({
        id: 'reference-workflow',
        source: 'catalog' as const,
        taskIds: Object.freeze(['task-1']),
      });
    }
    return undefined;
  }
}
