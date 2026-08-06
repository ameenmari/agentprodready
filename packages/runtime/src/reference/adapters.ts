/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { ExecutionSnapshotPort, RuntimeEventPublisher, RuntimeFact, RuntimePolicy, RuntimePolicyProvider, RuntimeTelemetry, StateTransition } from '../contracts/runtime.js';
export class StaticRuntimePolicyProvider implements RuntimePolicyProvider {public constructor(private readonly policy:RuntimePolicy){} public get(){return this.policy;}}
export class InMemoryRuntimeEventPublisher implements RuntimeEventPublisher {readonly #facts:RuntimeFact[]=[];public async publish(fact:RuntimeFact){this.#facts.push(fact);}public facts(){return Object.freeze([...this.#facts]);}}
export class InMemoryExecutionSnapshotPort implements ExecutionSnapshotPort {readonly #items=new Map<string,readonly StateTransition[]>();public async store(id:string,history:readonly StateTransition[]){this.#items.set(id,Object.freeze([...history]));}public load(id:string){return this.#items.get(id);}}
export class NoopRuntimeTelemetry implements RuntimeTelemetry {public transition(_fact:RuntimeFact){}public completed(_id:string,_duration:number,_attempts:number){}public failed(_id:string,_code:string,_duration:number){}}
