import type { ExecutionContext } from '@agentprodready/foundation';
import {
  CatalogOrGeneratedWorkflowPlanner,
  DeduplicatingPlanOptimizer,
  InMemoryPlanningEventPublisher,
  InMemoryWorkflowCatalog,
  NoopPlanningTelemetry,
  ObjectiveGoalAnalyzer,
  ObjectiveIntentAnalyzer,
  PlanningEngine,
  RuntimePlanningAdapter,
  StrictPlanValidator,
  TaskCapabilityPlanner,
  TaskStrategySelector,
  type Intent,
  type PlannedTask,
  type TaskDecomposer,
} from '@agentprodready/planning';
import {
  InMemoryWorkflowFacts,
  InMemoryWorkflowSnapshots,
  NoopWorkflowTelemetry,
  RuntimeWorkflowAdapter,
  WorkflowEngine,
} from '@agentprodready/workflow';

class SingleTextGenerationDecomposer implements TaskDecomposer {
  public async decompose(
    objective: string,
    _intent: Intent,
    _context: ExecutionContext,
  ): Promise<readonly PlannedTask[]> {
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

export function createEmbeddedPlanningAdapter(): RuntimePlanningAdapter {
  const engine = new PlanningEngine({
    goals: new ObjectiveGoalAnalyzer(),
    intents: new ObjectiveIntentAnalyzer(),
    tasks: new SingleTextGenerationDecomposer(),
    capabilities: new TaskCapabilityPlanner(),
    strategies: new TaskStrategySelector(),
    workflows: new CatalogOrGeneratedWorkflowPlanner(),
    catalog: new InMemoryWorkflowCatalog(),
    optimizer: new DeduplicatingPlanOptimizer(),
    validator: new StrictPlanValidator(),
    events: new InMemoryPlanningEventPublisher(),
    telemetry: new NoopPlanningTelemetry(),
  });
  return new RuntimePlanningAdapter(engine);
}

export function createEmbeddedWorkflowAdapter(): RuntimeWorkflowAdapter {
  return new RuntimeWorkflowAdapter(
    (graph, context) =>
      new WorkflowEngine(
        graph,
        context,
        new InMemoryWorkflowFacts(),
        new NoopWorkflowTelemetry(),
        new InMemoryWorkflowSnapshots(),
      ),
  );
}
