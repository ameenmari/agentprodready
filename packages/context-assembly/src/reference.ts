import type { ContextDiagnostic,ContextDiagnostics,ContextEvents,ContextFact,ContextTelemetry,ExecutionContextPackage } from './index.js';

export class InMemoryContextDiagnostics implements ContextDiagnostics {readonly #items:ContextDiagnostic[]=[];public record(value:ContextDiagnostic):void{this.#items.push(value);}public list():readonly ContextDiagnostic[]{return Object.freeze([...this.#items]);}}
export class InMemoryContextEvents implements ContextEvents {readonly facts:ContextFact[]=[];public async publish(value:ContextFact):Promise<void>{this.facts.push(value);}}
export class NoopContextTelemetry implements ContextTelemetry {public completed(_status:ExecutionContextPackage['status'],_included:number,_used:number):void{}public failed(_code:string):void{}}
