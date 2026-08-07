import type { ExecutionContext } from '@agentprodready/foundation';
import type { PluginContribution } from '@agentprodready/plugin-framework';
import type { CapabilityInvocationPort } from '@agentprodready/runtime';
import type { NodeExecutionContract } from '@agentprodready/workflow';
import type {
  CapabilityBinding,
  CapabilityDefinition,
  CapabilityRequest,
  CapabilityStore,
  ImplementationDescriptor,
  PolicyDecision,
  PolicyInput,
  ProviderStore,
  ResolutionConfiguration,
  ResolutionConfigurationProvider,
  ResolutionDiagnostic,
  ResolutionDiagnostics,
  ResolutionEventPublisher,
  ResolutionPolicy,
  ResolutionRoutingConfiguration,
  ResolutionTelemetry,
  ResolveNextOptions,
} from '../contracts/capability.js';
import { ResolutionError, type ResolutionErrorCode } from '../errors/resolution-error.js';

export class CapabilityRegistry implements CapabilityStore {
  readonly #items = new Map<string, CapabilityDefinition>();
  public register(value: CapabilityDefinition): void {
    if (this.#items.has(value.id)) throw new TypeError(`Duplicate capability ${value.id}`);
    this.#items.set(value.id, deepFreeze(copyCapability(value)));
  }
  public get(id: string): CapabilityDefinition | undefined {
    return this.#items.get(id);
  }
  public list(): readonly CapabilityDefinition[] {
    return Object.freeze([...this.#items.values()].sort(byId));
  }
}

export class ProviderRegistry implements ProviderStore {
  readonly #items = new Map<string, ImplementationDescriptor>();
  public register(value: ImplementationDescriptor): void {
    if (this.#items.has(value.id)) throw new TypeError(`Duplicate implementation ${value.id}`);
    this.#items.set(value.id, deepFreeze(copyImplementation(value)));
  }
  public get(id: string): ImplementationDescriptor | undefined {
    return this.#items.get(id);
  }
  public forCapability(id: string): readonly ImplementationDescriptor[] {
    return Object.freeze(this.list().filter((item) => item.capabilityId === id));
  }
  public list(): readonly ImplementationDescriptor[] {
    return Object.freeze([...this.#items.values()].sort(byId));
  }
  /** Test/ops: update health without re-registering. */
  public setHealth(id: string, health: ImplementationDescriptor['health']): void {
    const current = this.#items.get(id);
    if (current === undefined) throw new TypeError(`Unknown implementation ${id}`);
    this.#items.set(id, deepFreeze(copyImplementation({ ...current, health })));
  }
}

export class DeterministicResolutionPolicy implements ResolutionPolicy {
  public select(input: PolicyInput): PolicyDecision {
    const rejected: { implementationId: string; reason: string }[] = [];
    const eligible = input.candidates.filter((candidate) => {
      const reason = ineligibleReason(candidate, input.request);
      if (reason !== undefined) rejected.push({ implementationId: candidate.id, reason });
      return reason === undefined;
    });

    const routing = input.configuration.routing?.[input.request.capability];
    if (routing !== undefined && routing.orderedImplementationIds.length > 0) {
      const exclude = new Set(input.excludeImplementationIds ?? []);
      for (const id of routing.orderedImplementationIds) {
        if (exclude.has(id)) continue;
        const winner = eligible.find((item) => item.id === id);
        if (winner !== undefined) {
          return deepFreeze({
            implementation: winner,
            source: routing.mode === 'fallback' ? 'global' : 'global',
            rejected,
          });
        }
        if (routing.mode === 'fixed') {
          throw policyError(input, id, rejected);
        }
        rejected.push({ implementationId: id, reason: 'ordered candidate unavailable' });
      }
      if (routing.mode === 'fallback') {
        throw new ResolutionError(
          'RESOLUTION_NO_IMPLEMENTATION',
          'Capability resolution failed: fallback candidates exhausted',
          deepFreeze({
            id: `resolution:${input.request.requestId}`,
            requestId: input.request.requestId,
            capability: input.request.capability,
            outcome: 'failed' as const,
            candidates: input.candidates.map((x) => x.id),
            rejected,
            errorCode: 'RESOLUTION_NO_IMPLEMENTATION',
          }),
        );
      }
    }

    for (const source of ['tenant', 'workspace', 'project', 'global'] as const) {
      const configured = input.configuration[source]?.[input.request.capability];
      if (configured !== undefined) {
        const winner = eligible.find((item) => item.id === configured);
        if (winner === undefined) throw policyError(input, configured, rejected);
        return deepFreeze({ implementation: winner, source, rejected });
      }
    }
    const winner = eligible.find((item) => item.id === input.capability.defaultImplementationId);
    if (winner === undefined) throw policyError(input, input.capability.defaultImplementationId, rejected);
    return deepFreeze({ implementation: winner, source: 'default', rejected });
  }
}

export class CapabilityResolver {
  public constructor(
    private readonly capabilities: CapabilityStore,
    private readonly providers: ProviderStore,
    private readonly policy: ResolutionPolicy,
    private readonly configuration: ResolutionConfigurationProvider,
    private readonly diagnostics: ResolutionDiagnostics,
    private readonly events: ResolutionEventPublisher,
    private readonly telemetry: ResolutionTelemetry,
  ) {}

  public async resolve(request: CapabilityRequest): Promise<CapabilityBinding> {
    return this.#resolveInternal(request, Object.freeze([]));
  }

  /** Next unused eligible candidate for fallback mode (Amendment 07). */
  public async resolveNext(
    request: CapabilityRequest,
    options: ResolveNextOptions,
  ): Promise<CapabilityBinding> {
    return this.#resolveInternal(request, Object.freeze([...options.excludeImplementationIds]));
  }

  async #resolveInternal(
    request: CapabilityRequest,
    excludeImplementationIds: readonly string[],
  ): Promise<CapabilityBinding> {
    const started = Date.now();
    const diagnosticId = `resolution:${request.requestId}`;
    let candidates: readonly ImplementationDescriptor[] = [];
    try {
      validateRequest(request);
      const capability = this.capabilities.get(request.capability);
      if (capability === undefined) {
        throw this.#failure('RESOLUTION_UNKNOWN_CAPABILITY', request, diagnosticId, candidates, []);
      }
      candidates = this.providers.forCapability(request.capability);
      if (candidates.length === 0) {
        throw this.#failure('RESOLUTION_NO_IMPLEMENTATION', request, diagnosticId, candidates, []);
      }
      const version = request.contractVersion ?? capability.contractVersions.at(-1);
      if (version === undefined || !capability.contractVersions.includes(version)) {
        throw this.#failure('RESOLUTION_INCOMPATIBLE_VERSION', request, diagnosticId, candidates, []);
      }
      const configuration = await this.configuration.get(request.context);
      const decision = this.policy.select({
        request,
        capability,
        candidates,
        configuration,
        excludeImplementationIds,
      });
      const diagnostic: ResolutionDiagnostic = deepFreeze({
        id: diagnosticId,
        requestId: request.requestId,
        capability: request.capability,
        outcome: 'resolved',
        candidates: candidates.map((x) => x.id),
        selected: decision.implementation.id,
        source: decision.source,
        rejected: decision.rejected,
      });
      this.diagnostics.record(diagnostic);
      const binding: CapabilityBinding = deepFreeze({
        bindingId: `binding:${request.requestId}`,
        requestId: request.requestId,
        capability: request.capability,
        capabilityContractVersion: version,
        implementationId: decision.implementation.id,
        implementationVersion: decision.implementation.implementationVersion,
        provider: {
          id: decision.implementation.providerId,
          pluginId: decision.implementation.pluginId,
          contributionId: decision.implementation.contributionId,
        },
        source: decision.source,
        diagnosticId,
      });
      await this.events.publish({
        type: 'capability.resolved',
        requestId: request.requestId,
        capability: request.capability,
        diagnosticId,
        executionId: request.context.executionId,
      });
      this.telemetry.resolved(request.capability, Date.now() - started, decision.source);
      return binding;
    } catch (error) {
      const normalized =
        error instanceof ResolutionError
          ? error
          : this.#failure('RESOLUTION_INVALID_REQUEST', request, diagnosticId, candidates, []);
      if (this.diagnostics.get(diagnosticId) === undefined) this.diagnostics.record(normalized.diagnostic);
      await this.events.publish({
        type: 'capability.failed',
        requestId: request.requestId,
        capability: request.capability,
        diagnosticId,
        executionId: request.context.executionId,
      });
      this.telemetry.failed(request.capability, normalized.code, Date.now() - started);
      throw normalized;
    }
  }

  #failure(
    code: ResolutionErrorCode,
    request: CapabilityRequest,
    id: string,
    candidates: readonly ImplementationDescriptor[],
    rejected: readonly { implementationId: string; reason: string }[],
  ): ResolutionError {
    return new ResolutionError(
      code,
      `Capability resolution failed: ${code}`,
      deepFreeze({
        id,
        requestId: request.requestId,
        capability: request.capability,
        outcome: 'failed',
        candidates: candidates.map((x) => x.id),
        rejected,
        errorCode: code,
      }),
    );
  }
}

export class RuntimeCapabilityResolutionAdapter implements CapabilityInvocationPort {
  public constructor(private readonly resolver: CapabilityResolver) {}
  public async invoke(work: unknown, context: ExecutionContext, signal: AbortSignal): Promise<readonly CapabilityBinding[]> {
    if (signal.aborted) throw new TypeError('Resolution aborted');
    const nodes = extractNodes(work);
    return await Promise.all(
      nodes
        .filter((node) => node.capability !== undefined)
        .map((node, index) =>
          this.resolver.resolve({
            requestId: `${context.executionId}:${node.nodeId}:${String(index)}`,
            capability: node.capability ?? '',
            context,
            node,
            constraints: Object.freeze({}),
          }),
        ),
    );
  }
}

export class PluginCapabilityRegistrationAdapter {
  public register(pluginId: string, contribution: PluginContribution, providers: ProviderStore): void {
    if (contribution.kind !== 'provider') throw new TypeError('Contribution must be a provider');
    const metadata = contribution.metadata;
    const capability = requiredString(metadata, 'capability');
    providers.register({
      id: contribution.id,
      capabilityId: capability,
      providerId: requiredString(metadata, 'providerId'),
      pluginId,
      contributionId: contribution.id,
      contractVersions: requiredStrings(metadata, 'contractVersions'),
      implementationVersion: contribution.version,
      enabled: metadata.enabled !== false,
      health: 'healthy',
      priority: typeof metadata.priority === 'number' ? metadata.priority : 0,
      attributes: Object.freeze({}),
    });
  }
}

export function validateResolutionRouting(
  capability: string,
  routing: ResolutionRoutingConfiguration,
  providers: ProviderStore,
): void {
  if (routing.orderedImplementationIds.length === 0) {
    throw new TypeError(`Routing for ${capability} requires orderedImplementationIds`);
  }
  const seen = new Set<string>();
  for (const id of routing.orderedImplementationIds) {
    if (id.trim() === '') throw new TypeError(`Empty implementation id in routing for ${capability}`);
    if (seen.has(id)) throw new TypeError(`Duplicate implementation id ${id} in routing for ${capability}`);
    seen.add(id);
    if (providers.get(id) === undefined) {
      throw new TypeError(`Unknown implementation id ${id} in routing for ${capability}`);
    }
  }
  if (routing.mode === 'fallback' && routing.orderedImplementationIds.length < 2) {
    throw new TypeError(`fallback mode for ${capability} requires at least one fallback candidate`);
  }
}

function validateRequest(request: CapabilityRequest): void {
  if (
    request.requestId.trim() === '' ||
    request.capability.trim() === '' ||
    request.node.capability !== request.capability ||
    containsProviderKey(request.constraints)
  ) {
    throw new TypeError('Invalid provider-independent request');
  }
}

function ineligibleReason(candidate: ImplementationDescriptor, request: CapabilityRequest): string | undefined {
  if (!candidate.enabled) return 'disabled';
  if (candidate.health === 'unhealthy') return 'unhealthy';
  if (request.contractVersion !== undefined && !candidate.contractVersions.includes(request.contractVersion)) {
    return 'incompatible-version';
  }
  const { locality, compliance } = request.constraints;
  if (locality !== undefined && candidate.attributes.locality !== locality) return 'locality';
  if (compliance !== undefined && candidate.attributes.compliance !== compliance) return 'compliance';
  return undefined;
}

function policyError(
  input: PolicyInput,
  id: string,
  rejected: readonly { implementationId: string; reason: string }[],
): ResolutionError {
  const diagnostic: ResolutionDiagnostic = {
    id: `resolution:${input.request.requestId}`,
    requestId: input.request.requestId,
    capability: input.request.capability,
    outcome: 'failed',
    candidates: input.candidates.map((x) => x.id),
    rejected: [...rejected, { implementationId: id, reason: 'configured implementation is unavailable' }],
    errorCode: 'RESOLUTION_CONFIGURED_IMPLEMENTATION_INVALID',
  };
  return new ResolutionError(
    'RESOLUTION_CONFIGURED_IMPLEMENTATION_INVALID',
    `Configured implementation ${id} is invalid`,
    deepFreeze(diagnostic),
  );
}

function extractNodes(work: unknown): readonly NodeExecutionContract[] {
  if (typeof work !== 'object' || work === null || !('eligible' in work) || !Array.isArray(work.eligible)) {
    throw new TypeError('Runtime work has no eligible node contracts');
  }
  return work.eligible as readonly NodeExecutionContract[];
}

function containsProviderKey(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return Object.entries(value).some(
    ([key, child]) => /provider|implementation/iu.test(key) || containsProviderKey(child),
  );
}

function requiredString(value: Readonly<Record<string, unknown>>, key: string): string {
  const item = value[key];
  if (typeof item !== 'string' || item.trim() === '') throw new TypeError(`Missing ${key}`);
  return item;
}

function requiredStrings(value: Readonly<Record<string, unknown>>, key: string): readonly string[] {
  const item = value[key];
  if (!Array.isArray(item) || !item.every((entry) => typeof entry === 'string')) throw new TypeError(`Missing ${key}`);
  return Object.freeze([...item]);
}

function copyCapability(value: CapabilityDefinition): CapabilityDefinition {
  return { ...value, contractVersions: [...value.contractVersions], metadata: { ...value.metadata } };
}

function copyImplementation(value: ImplementationDescriptor): ImplementationDescriptor {
  return { ...value, contractVersions: [...value.contractVersions], attributes: { ...value.attributes } };
}

function byId<T extends { readonly id: string }>(a: T, b: T): number {
  return a.id.localeCompare(b.id);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

// silence unused import when tree-shaking ResolutionConfiguration in types-only use
void 0 as unknown as ResolutionConfiguration;
