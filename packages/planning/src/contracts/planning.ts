import type { ExecutionContext } from '@agentforge/foundation';

export type ExecutionStrategy = 'single-step' | 'sequential' | 'parallel' | 'workflow';
export interface PlanningRequest { readonly objective: string; readonly context: ExecutionContext; readonly signal?: AbortSignal; }
export interface Goal { readonly statement: string; }
export interface Intent { readonly name: string; readonly outcome: string; }
/** Bootstrap owner: Blueprint 07 Capability Resolution. */
export interface CapabilityRequirement { readonly capability: string; readonly constraints: Readonly<Record<string, string>>; }
export interface PlannedTask { readonly id: string; readonly description: string; readonly capability: string; readonly dependencies: readonly string[]; readonly optional: boolean; }
/** Bootstrap owner: Blueprint 06 Workflow Engine. */
export interface WorkflowDefinition { readonly id: string; readonly source: 'catalog'|'generated'; readonly taskIds: readonly string[]; }
export interface PlanningValidation { readonly valid: true; readonly checkedAt: string; }
export interface OptimizationMetadata { readonly removedTaskIds: readonly string[]; readonly originalTaskCount: number; readonly optimizedTaskCount: number; }
export interface PlanningMetadata { readonly plannerVersion: string; readonly createdAt: string; readonly executionId: string; readonly correlationId: string; }
export interface ExecutionPlan { readonly planId: string; readonly objective: string; readonly goal: Goal; readonly intent: Intent; readonly strategy: ExecutionStrategy; readonly requiredCapabilities: readonly CapabilityRequirement[]; readonly tasks: readonly PlannedTask[]; readonly workflow: WorkflowDefinition; readonly decisionPoints: readonly string[]; readonly validation: PlanningValidation; readonly optimization: OptimizationMetadata; readonly metadata: PlanningMetadata; }

export interface GoalAnalyzer { analyze(objective:string,context:ExecutionContext):Goal|Promise<Goal>; }
export interface IntentAnalyzer { analyze(objective:string,goal:Goal,context:ExecutionContext):Intent|Promise<Intent>; }
export interface TaskDecomposer { decompose(objective:string,intent:Intent,context:ExecutionContext):readonly PlannedTask[]|Promise<readonly PlannedTask[]>; }
export interface CapabilityPlanner { identify(tasks:readonly PlannedTask[],context:ExecutionContext):readonly CapabilityRequirement[]|Promise<readonly CapabilityRequirement[]>; }
export interface StrategySelector { select(tasks:readonly PlannedTask[],context:ExecutionContext):ExecutionStrategy|Promise<ExecutionStrategy>; }
export interface WorkflowCatalog { find(objective:string,tasks:readonly PlannedTask[]):WorkflowDefinition|undefined|Promise<WorkflowDefinition|undefined>; }
export interface WorkflowPlanner { plan(objective:string,tasks:readonly PlannedTask[],catalog:WorkflowCatalog):WorkflowDefinition|Promise<WorkflowDefinition>; }
export interface PlanOptimizer { optimize(tasks:readonly PlannedTask[]):{readonly tasks:readonly PlannedTask[];readonly metadata:OptimizationMetadata}; }
export interface PlanValidator { validate(plan:Omit<ExecutionPlan,'validation'>):void; }
export interface PlanningFact { readonly type:string;readonly planId:string;readonly executionId:string;readonly correlationId:string;readonly occurredAt:string; }
export interface PlanningEventPublisher { publish(fact:PlanningFact):Promise<void>; }
export interface PlanningTelemetry { started(executionId:string):void; completed(executionId:string,durationMs:number,taskCount:number):void; failed(executionId:string,code:string):void; }
export interface PlanningDependencies { readonly goals:GoalAnalyzer;readonly intents:IntentAnalyzer;readonly tasks:TaskDecomposer;readonly capabilities:CapabilityPlanner;readonly strategies:StrategySelector;readonly workflows:WorkflowPlanner;readonly catalog:WorkflowCatalog;readonly optimizer:PlanOptimizer;readonly validator:PlanValidator;readonly events:PlanningEventPublisher;readonly telemetry:PlanningTelemetry;readonly now?:()=>Date; }
export interface PlanningDiagnostics { readonly completed:number;readonly failed:number;readonly lastPlanId?:string;readonly lastTaskCount?:number; }
