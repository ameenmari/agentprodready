import { Module } from '@nestjs/common';
import { ApplicationHost } from './application/application-host.js';
import { ExecutionContextFactory } from './application/execution-context-factory.js';
import { HealthService, ReadinessService } from './application/health.js';
import { DeterministicCapabilityResolver, InMemoryCapabilityRegistry, InMemoryPluginRegistry } from './application/registries.js';
import { DenyByDefaultAuthorizationService, InMemoryAuditPublisher, InMemoryEventPublisher, NoopTelemetry } from './reference/adapters.js';
import * as tokens from './tokens.js';

const providers = [
  { provide: tokens.AGENTFORGE_APPLICATION_HOST, useFactory: (): ApplicationHost => new ApplicationHost([]) },
  { provide: tokens.AGENTFORGE_EXECUTION_CONTEXT_FACTORY, useClass: ExecutionContextFactory },
  { provide: tokens.AGENTFORGE_PLUGIN_REGISTRY, useClass: InMemoryPluginRegistry },
  { provide: tokens.AGENTFORGE_CAPABILITY_REGISTRY, useClass: InMemoryCapabilityRegistry },
  { provide: tokens.AGENTFORGE_CAPABILITY_RESOLVER, useFactory: (registry: InMemoryCapabilityRegistry): DeterministicCapabilityResolver => new DeterministicCapabilityResolver(registry), inject: [tokens.AGENTFORGE_CAPABILITY_REGISTRY] },
  { provide: tokens.AGENTFORGE_AUTHORIZATION_SERVICE, useClass: DenyByDefaultAuthorizationService },
  { provide: tokens.AGENTFORGE_EVENT_PUBLISHER, useClass: InMemoryEventPublisher },
  { provide: tokens.AGENTFORGE_AUDIT_PUBLISHER, useClass: InMemoryAuditPublisher },
  { provide: tokens.AGENTFORGE_TELEMETRY, useClass: NoopTelemetry },
  { provide: tokens.AGENTFORGE_HEALTH_SERVICE, useFactory: (): HealthService => new HealthService([]) },
  { provide: tokens.AGENTFORGE_READINESS_SERVICE, useFactory: (health: HealthService): ReadinessService => new ReadinessService(health), inject: [tokens.AGENTFORGE_HEALTH_SERVICE] },
];

@Module({ providers, exports: providers })
export class FoundationModule {}
