import type { ExecutionContext } from '@agentprodready/foundation';
import type { PlannedTask, TaskDecomposer } from '@agentprodready/planning';

/** Maps any objective to a single text-generation task for the reference agent product. */
export class ReferenceAgentTaskDecomposer implements TaskDecomposer {
  public async decompose(objective: string, _intent: unknown, _context: ExecutionContext): Promise<readonly PlannedTask[]> {
    return Object.freeze([
      Object.freeze({
        id: 'task-1',
        description: objective,
        capability: 'text-generation',
        dependencies: Object.freeze([]),
        optional: false,
      }),
    ]);
  }
}
