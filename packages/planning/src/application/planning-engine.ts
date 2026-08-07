import type { ExecutionContext } from '@agentprodready/foundation';
import type { PlanningPort } from '@agentprodready/runtime';
import type { ExecutionPlan, PlanningDependencies, PlanningDiagnostics, PlanningFact, PlanningRequest } from '../contracts/planning.js';
import { PlanningError } from '../errors/planning-error.js';

export class PlanningEngine {
  #completed=0; #failed=0; #lastPlanId:string|undefined; #lastTaskCount:number|undefined;
  public constructor(private readonly dependencies:PlanningDependencies){}
  public async createPlan(request:PlanningRequest):Promise<ExecutionPlan>{
    const started=Date.now(); const objective=request.objective.trim();
    if(objective==='')throw new PlanningError('PLANNING_INVALID_OBJECTIVE','Objective must not be empty');
    this.#assertActive(request.signal); this.dependencies.telemetry.started(request.context.executionId);
    const now:()=>Date=this.dependencies.now??(():Date=>new Date());
    const planId=`plan:${request.context.executionId}`;
    try{
      await this.#publish('planning.started',planId,request.context,now);
      const goal=await this.dependencies.goals.analyze(objective,request.context);
      const intent=await this.dependencies.intents.analyze(objective,goal,request.context);
      const original=await this.dependencies.tasks.decompose(objective,intent,request.context);
      this.#assertActive(request.signal);
      const optimized=this.dependencies.optimizer.optimize(original);
      const capabilities=await this.dependencies.capabilities.identify(optimized.tasks,request.context);
      const strategy=await this.dependencies.strategies.select(optimized.tasks,request.context);
      const workflow=await this.dependencies.workflows.plan(objective,optimized.tasks,this.dependencies.catalog);
      const withoutValidation=deepFreeze({planId,objective,goal,intent,strategy,requiredCapabilities:capabilities,tasks:optimized.tasks,workflow,decisionPoints:[],optimization:optimized.metadata,metadata:{plannerVersion:'0.1.0',createdAt:now().toISOString(),executionId:request.context.executionId,correlationId:request.context.correlationId}});
      this.dependencies.validator.validate(withoutValidation);
      const plan=deepFreeze({...withoutValidation,validation:{valid:true as const,checkedAt:now().toISOString()}});
      await this.#publish('planning.completed',planId,request.context,now);
      this.#completed++;this.#lastPlanId=planId;this.#lastTaskCount=plan.tasks.length;
      this.dependencies.telemetry.completed(request.context.executionId,Date.now()-started,plan.tasks.length);
      return plan;
    }catch(error){this.#failed++;const normalized=error instanceof PlanningError?error:new PlanningError('PLANNING_FAILED','Planning failed',{cause:error});this.dependencies.telemetry.failed(request.context.executionId,normalized.code);try{await this.#publish('planning.failed',planId,request.context,now);}catch{/* retain planning error */}throw normalized;}
  }
  public diagnostics():PlanningDiagnostics {const result:PlanningDiagnostics={completed:this.#completed,failed:this.#failed,...(this.#lastPlanId===undefined?{}:{lastPlanId:this.#lastPlanId}),...(this.#lastTaskCount===undefined?{}:{lastTaskCount:this.#lastTaskCount})};return Object.freeze(result);}
  async #publish(type:string,planId:string,context:ExecutionContext,now:()=>Date):Promise<void>{const fact:PlanningFact=Object.freeze({type,planId,executionId:context.executionId,correlationId:context.correlationId,occurredAt:now().toISOString()});await this.dependencies.events.publish(fact);}
  #assertActive(signal:AbortSignal|undefined):void{if(signal?.aborted===true)throw new PlanningError('PLANNING_ABORTED','Planning was aborted');}
}

export class RuntimePlanningAdapter implements PlanningPort {
  public constructor(private readonly engine:PlanningEngine){}
  public async plan(input:unknown,context:ExecutionContext,signal:AbortSignal):Promise<ExecutionPlan>{const objective=typeof input==='string'?input:isObjective(input)?input.objective:'';return await this.engine.createPlan({objective,context,signal});}
}
function isObjective(value:unknown):value is {readonly objective:string}{return typeof value==='object'&&value!==null&&'objective'in value&&typeof value.objective==='string';}
function deepFreeze<T>(value:T):T {if(typeof value==='object'&&value!==null&&!Object.isFrozen(value)){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;}

