export type PlanningErrorCode='PLANNING_INVALID_OBJECTIVE'|'PLANNING_ABORTED'|'PLANNING_INVALID_PLAN'|'PLANNING_DEPENDENCY_CYCLE'|'PLANNING_PROVIDER_LEAKAGE'|'PLANNING_FAILED';
export class PlanningError extends Error { public constructor(public readonly code:PlanningErrorCode,message:string,options?:ErrorOptions){super(message,options);this.name='PlanningError';} }
