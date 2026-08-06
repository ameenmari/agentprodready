import type { ExecutionContext } from '@agentforge/foundation';
import type { NodeExecutionContract } from '@agentforge/workflow';

export interface CapabilityDefinition {readonly id:string;readonly contractVersions:readonly string[];readonly defaultImplementationId:string;readonly metadata:Readonly<Record<string,string>>;}
export interface ImplementationDescriptor {readonly id:string;readonly capabilityId:string;readonly providerId:string;readonly pluginId:string;readonly contributionId:string;readonly contractVersions:readonly string[];readonly implementationVersion:string;readonly enabled:boolean;readonly health:'healthy'|'degraded'|'unhealthy';readonly priority:number;readonly attributes:Readonly<Record<string,string>>;}
export interface ResolutionConstraints {readonly locality?:string;readonly compliance?:string;readonly maximumLatencyMs?:number;readonly maximumCost?:number;readonly preferences?:Readonly<Record<string,string>>;}
export interface CapabilityRequest {readonly requestId:string;readonly capability:string;readonly contractVersion?:string;readonly context:ExecutionContext;readonly node:NodeExecutionContract;readonly constraints:ResolutionConstraints;}
export type PrecedenceSource='tenant'|'workspace'|'project'|'global'|'default';
export interface CapabilityBinding {readonly bindingId:string;readonly requestId:string;readonly capability:string;readonly capabilityContractVersion:string;readonly implementationId:string;readonly implementationVersion:string;readonly provider:Readonly<{id:string;pluginId:string;contributionId:string}>;readonly source:PrecedenceSource;readonly diagnosticId:string;}
export interface ResolutionConfiguration {readonly tenant?:Readonly<Record<string,string>>;readonly workspace?:Readonly<Record<string,string>>;readonly project?:Readonly<Record<string,string>>;readonly global?:Readonly<Record<string,string>>;}
export interface ResolutionConfigurationProvider {get(context:ExecutionContext):ResolutionConfiguration|Promise<ResolutionConfiguration>;}
export interface CapabilityStore {register(definition:CapabilityDefinition):void;get(id:string):CapabilityDefinition|undefined;list():readonly CapabilityDefinition[];}
export interface ProviderStore {register(descriptor:ImplementationDescriptor):void;get(id:string):ImplementationDescriptor|undefined;forCapability(id:string):readonly ImplementationDescriptor[];list():readonly ImplementationDescriptor[];}
export interface PolicyInput {readonly request:CapabilityRequest;readonly capability:CapabilityDefinition;readonly candidates:readonly ImplementationDescriptor[];readonly configuration:ResolutionConfiguration;}
export interface PolicyDecision {readonly implementation:ImplementationDescriptor;readonly source:PrecedenceSource;readonly rejected:readonly {readonly implementationId:string;readonly reason:string}[];}
export interface ResolutionPolicy {select(input:PolicyInput):PolicyDecision;}
export interface ResolutionDiagnostic {readonly id:string;readonly requestId:string;readonly capability:string;readonly outcome:'resolved'|'failed';readonly candidates:readonly string[];readonly selected?:string;readonly source?:PrecedenceSource;readonly rejected:readonly {readonly implementationId:string;readonly reason:string}[];readonly errorCode?:string;}
export interface ResolutionDiagnostics {record(diagnostic:ResolutionDiagnostic):void;get(id:string):ResolutionDiagnostic|undefined;list():readonly ResolutionDiagnostic[];}
export interface ResolutionFact {readonly type:'capability.resolved'|'capability.failed';readonly requestId:string;readonly capability:string;readonly diagnosticId:string;readonly executionId:string;}
export interface ResolutionEventPublisher {publish(fact:ResolutionFact):Promise<void>;}
export interface ResolutionTelemetry {resolved(capability:string,durationMs:number,source:PrecedenceSource):void;failed(capability:string,code:string,durationMs:number):void;}
