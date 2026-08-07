import { Module } from '@nestjs/common';
import { ApplicationHost } from './application/application-host.js';
import { ExecutionContextFactory } from './application/execution-context-factory.js';
import { HealthService, ReadinessService } from './application/health.js';
import { DeterministicCapabilityResolver, InMemoryCapabilityRegistry, InMemoryPluginRegistry } from './application/registries.js';
import { DenyByDefaultAuthorizationService, InMemoryAuditPublisher, InMemoryEventPublisher, NoopTelemetry } from './reference/adapters.js';
import * as tokens from './tokens.js';

const providers = [
  { provide: tokens.AGENTPRODREADY_APPLICATION_HOST, useFactory: (): ApplicationHost => new ApplicationHost([]) },
  { provide: tokens.AGENTPRODREADY_EXECUTION_CONTEXT_FACTORY, useClass: ExecutionContextFactory },
  { provide: tokens.AGENTPRODREADY_PLUGIN_REGISTRY, useClass: InMemoryPluginRegistry },
  { provide: tokens.AGENTPRODREADY_CAPABILITY_REGISTRY, useClass: InMemoryCapabilityRegistry },
  { provide: tokens.AGENTPRODREADY_CAPABILITY_RESOLVER, useFactory: (registry: InMemoryCapabilityRegistry): DeterministicCapabilityResolver => new DeterministicCapabilityResolver(registry), inject: [tokens.AGENTPRODREADY_CAPABILITY_REGISTRY] },
  { provide: tokens.AGENTPRODREADY_AUTHORIZATION_SERVICE, useClass: DenyByDefaultAuthorizationService },
  { provide: tokens.AGENTPRODREADY_EVENT_PUBLISHER, useClass: InMemoryEventPublisher },
  { provide: tokens.AGENTPRODREADY_AUDIT_PUBLISHER, useClass: InMemoryAuditPublisher },
  { provide: tokens.AGENTPRODREADY_TELEMETRY, useClass: NoopTelemetry },
  { provide: tokens.AGENTPRODREADY_HEALTH_SERVICE, useFactory: (): HealthService => new HealthService([]) },
  { provide: tokens.AGENTPRODREADY_READINESS_SERVICE, useFactory: (health: HealthService): ReadinessService => new ReadinessService(health), inject: [tokens.AGENTPRODREADY_HEALTH_SERVICE] },
];

@Module({ providers, exports: providers })
export class FoundationModule {}
