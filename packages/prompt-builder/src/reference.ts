import type { PromptDiagnostic,PromptDiagnostics,PromptEvents,PromptFact,PromptPackage,PromptTelemetry } from './index.js';

export class InMemoryPromptDiagnostics implements PromptDiagnostics {readonly #items:PromptDiagnostic[]=[];public record(value:PromptDiagnostic):void{this.#items.push(value);}public list():readonly PromptDiagnostic[]{return Object.freeze([...this.#items]);}}
export class InMemoryPromptEvents implements PromptEvents {readonly facts:PromptFact[]=[];public async publish(value:PromptFact):Promise<void>{this.facts.push(value);}}
export class NoopPromptTelemetry implements PromptTelemetry {public completed(_status:PromptPackage['status'],_sections:number,_used:number,_profileId:string):void{}public failed(_code:string):void{}}
