import { describe, expect, it } from 'vitest';
import {
  buildDistributionPackage,
  DeterministicCompatibilityValidator,
  DeterministicManifestValidator,
  DistributionError,
  InMemoryDistributionAudit,
  InMemoryDistributionDiagnostics,
  InMemoryDistributionEvents,
  InMemoryPackageRegistry,
  PluginMarketplace,
  RegistryDependencyValidator,
  StaticIntegrityVerifier,
  StaticTrustEvaluator,
  type DistributionAuthorization,
  type DistributionPackage,
  type InstallationRequest,
  type PackageManifest,
  type PublisherIdentity,
} from './index.js';

const scope = { tenantId: 'tenant-1', workspaceId: 'workspace-1' },
  at = '2026-08-06T00:00:00.000Z';
interface Fixture {
  readonly marketplace: PluginMarketplace;
  readonly registry: InMemoryPackageRegistry;
  readonly events: InMemoryDistributionEvents;
  readonly audit: InMemoryDistributionAudit;
  readonly diagnostics: InMemoryDistributionDiagnostics;
}
function publisher(overrides: Partial<PublisherIdentity> = {}): PublisherIdentity {
  return {
    id: 'publisher-1',
    organization: 'AgentProdReady Labs',
    signingIdentityReference: 'signer:1',
    contactReference: 'contact:1',
    verificationStatus: 'verified',
    verificationReference: 'verification:1',
    metadata: { region: 'global' },
    identityVersion: '1',
    trustImplied: false,
    ...overrides,
  };
}
function manifest(version = '1.0.0', overrides: Partial<PackageManifest> = {}): PackageManifest {
  return {
    packageId: 'sample-plugin',
    version,
    kind: 'plugin',
    publisherId: 'publisher-1',
    name: 'Sample Plugin',
    description: 'A provider-neutral extension',
    categories: ['tools'],
    dependencies: [],
    compatibility: {
      platformRange: '^1.0.0',
      pluginApiRange: '^1.0.0',
      dependencyContracts: [],
      capabilityContracts: ['capability:sample:1'],
      agentContracts: [],
      workflowContracts: [],
    },
    capabilitiesProvided: ['sample'],
    capabilitiesRequired: [],
    contentReference: `content:sample:${version}`,
    integrity: {
      algorithm: 'sha256',
      digest: `digest-${version}`,
      signatureReference: `signature-${version}`,
    },
    license: { spdxId: 'MIT' },
    governance: { owner: 'team', policyVersion: '1', classification: 'public' },
    schemaVersion: '1',
    ...overrides,
  };
}
function pkg(
  version = '1.0.0',
  manifestOverrides: Partial<PackageManifest> = {},
  publisherValue = publisher(),
): DistributionPackage {
  return buildDistributionPackage(
    manifest(version, manifestOverrides),
    publisherValue,
    `artifact-${version}`,
    at,
  );
}
function auth(
  operation: DistributionAuthorization['operation'],
  overrides: Partial<DistributionAuthorization> = {},
): DistributionAuthorization {
  return {
    decisionId: `decision:${operation}`,
    principalId: 'admin-1',
    operation,
    authorized: true,
    state: 'active',
    scope,
    policyVersion: '1',
    restrictions: [],
    ...overrides,
  };
}
function installation(
  version = '1.0.0',
  operation: DistributionAuthorization['operation'] = 'install',
): InstallationRequest {
  return {
    id: `${operation}-${version}`,
    packageId: 'sample-plugin',
    version,
    scope,
    platformVersion: '1.2.0',
    pluginApiVersion: '1.1.0',
    availableContracts: ['capability:sample:1'],
    authorization: auth(operation),
    policy: { type: operation === 'update' ? 'approved-automatic' : 'manual', version: '1' },
    occurredAt: at,
    correlationId: 'correlation-1',
  };
}
function fixture(
  digests: Readonly<Record<string, string>> = {
    'artifact-1.0.0': 'digest-1.0.0',
    'artifact-2.0.0': 'digest-2.0.0',
  },
): Fixture {
  const registry = new InMemoryPackageRegistry(),
    events = new InMemoryDistributionEvents(),
    audit = new InMemoryDistributionAudit(),
    diagnostics = new InMemoryDistributionDiagnostics();
  return {
    marketplace: new PluginMarketplace(
      registry,
      new DeterministicManifestValidator(),
      new StaticIntegrityVerifier(digests),
      new DeterministicCompatibilityValidator(),
      new RegistryDependencyValidator(registry),
      new StaticTrustEvaluator(),
      events,
      audit,
      diagnostics,
    ),
    registry,
    events,
    audit,
    diagnostics,
  };
}
async function published(
  version = '1.0.0',
): Promise<Fixture & { readonly pkg: DistributionPackage }> {
  const value = fixture(),
    valuePackage = pkg(version);
  await value.marketplace.publish(valuePackage, auth('publish'), 'correlation-1');
  return { ...value, pkg: valuePackage };
}

describe('immutable packages, manifests, publisher, and trust', () => {
  it('normalizes deeply immutable provider-independent packages', () => {
    const value = pkg();
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.manifest.compatibility)).toBe(true);
    expect(value).toMatchObject({ immutable: true, artifactReference: 'artifact-1.0.0' });
    expect(JSON.stringify(value)).not.toMatch(/npm|yarn|pnpm|runtimeState|executionContext/);
  });
  it('rejects malformed, self-dependent, and secret-bearing manifests', () => {
    expect(() => pkg('bad')).toThrowError(DistributionError);
    expect(() =>
      pkg('1.0.0', {
        dependencies: [
          {
            packageId: 'sample-plugin',
            versionRange: '1.0.0',
            optional: false,
            contractReferences: [],
          },
        ],
      }),
    ).toThrow();
    expect(() => pkg('1.0.0', { description: 'privateKey credential' })).toThrowError(/forbidden/i);
  });
  it('keeps publisher identity independent from descriptive trust', () => {
    const value = pkg('1.0.0', {}, publisher({ verificationStatus: 'unverified' })),
      integrity = new StaticIntegrityVerifier({ 'artifact-1.0.0': 'digest-1.0.0' }).verify(value),
      trust = new StaticTrustEvaluator().evaluate(value, integrity);
    expect(value.publisher.trustImplied).toBe(false);
    expect(trust).toMatchObject({
      level: 'integrity-verified',
      authorizationImplied: false,
      safetyImplied: false,
    });
  });
  it('detects invalid signatures and integrity deterministically', () => {
    const value = pkg(),
      result = new StaticIntegrityVerifier(
        { 'artifact-1.0.0': 'wrong' },
        new Set(['signature-1.0.0']),
      ).verify(value);
    expect(result).toMatchObject({ valid: false, signatureValid: false });
  });
});

describe('authorization-aware discovery, compatibility, and dependencies', () => {
  it('denies unauthorized or cross-tenant discovery', async () => {
    const value = await published();
    expect(() =>
      value.marketplace.discover({
        id: 'discover',
        scope,
        authorization: auth('discover', { authorized: false }),
        categories: [],
        capabilities: [],
        publisherIds: [],
        installedOnly: false,
        limit: 10,
      }),
    ).toThrowError(/unauthorized/i);
    expect(() =>
      value.marketplace.discover({
        id: 'discover',
        scope: { tenantId: 'other' },
        authorization: auth('discover'),
        categories: [],
        capabilities: [],
        publisherIds: [],
        installedOnly: false,
        limit: 10,
      }),
    ).toThrow();
  });
  it('discovers by category, capability, publisher, and compatibility without implying install or execution', async () => {
    const value = await published(),
      result = value.marketplace.discover({
        id: 'discover',
        scope,
        authorization: auth('discover'),
        categories: ['tools'],
        capabilities: ['sample'],
        publisherIds: ['publisher-1'],
        compatibleWith: {
          packageId: 'ignored',
          version: 'ignored',
          platformVersion: '1.5.0',
          pluginApiVersion: '1.2.0',
          availableContracts: ['capability:sample:1'],
        },
        installedOnly: false,
        limit: 10,
      });
    expect(result.packages[0]).toMatchObject({
      packageId: 'sample-plugin',
      installationAuthorized: false,
      executionAuthorized: false,
    });
  });
  it('validates compatibility deterministically with explicit missing contracts', () => {
    const validator = new DeterministicCompatibilityValidator(),
      value = pkg();
    expect(
      validator.validate(value, {
        packageId: 'sample-plugin',
        version: '1.0.0',
        platformVersion: '2.0.0',
        pluginApiVersion: '1.0.0',
        availableContracts: [],
      }),
    ).toMatchObject({
      compatible: false,
      platformCompatible: false,
      missingContracts: ['capability:sample:1'],
    });
  });
  it('rejects installation when required package dependencies are absent', async () => {
    const value = fixture({ 'artifact-1.0.0': 'digest-1.0.0' }),
      dependent = pkg('1.0.0', {
        dependencies: [
          {
            packageId: 'required-lib',
            versionRange: '^1.0.0',
            optional: false,
            contractReferences: [],
          },
        ],
      });
    await value.marketplace.publish(dependent, auth('publish'), 'c');
    await expect(value.marketplace.install(installation())).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
    });
  });
});

describe('installation, version history, lifecycle, and accountability', () => {
  it('installs only after validation, integrity, compatibility, dependencies, trust, and authorization', async () => {
    const value = await published(),
      result = await value.marketplace.install(installation());
    expect(result).toMatchObject({
      status: 'installed',
      activationPerformed: false,
      executionPerformed: false,
      codeLoaded: false,
    });
    expect(result.registration.trust.level).toBe('publisher-verified');
  });
  it('keeps duplicate installation idempotent', async () => {
    const value = await published();
    await value.marketplace.install(installation());
    const duplicate = await value.marketplace.install(installation());
    expect(duplicate.status).toBe('already-installed');
    expect(value.registry.history('sample-plugin', scope)).toHaveLength(1);
  });
  it('rejects incompatible and untrusted installations explicitly', async () => {
    const incompatible = await published();
    await expect(
      incompatible.marketplace.install({ ...installation(), platformVersion: '2.0.0' }),
    ).rejects.toMatchObject({ code: 'COMPATIBILITY_FAILED' });
    const unsigned = fixture({ 'artifact-1.0.0': 'wrong' }),
      valuePackage = pkg();
    await unsigned.marketplace.publish(valuePackage, auth('publish'), 'c');
    await expect(unsigned.marketplace.install(installation())).rejects.toMatchObject({
      code: 'SIGNATURE_INVALID',
    });
  });
  it('updates while preserving deterministic immutable version history', async () => {
    const value = await published();
    await value.marketplace.install(installation());
    const second = pkg('2.0.0', {
      compatibility: { ...manifest().compatibility, platformRange: '^1.0.0' },
    });
    await value.marketplace.publish(second, auth('publish'), 'c');
    const result = await value.marketplace.update(installation('2.0.0', 'update'));
    expect(result.history).toMatchObject({
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      operation: 'update',
      previousRecordId: 'history:install-1.0.0',
    });
    expect(value.registry.history('sample-plugin', scope)).toHaveLength(2);
  });
  it('rolls back by appending history rather than mutating prior versions', async () => {
    const value = await published();
    await value.marketplace.install(installation());
    const second = pkg('2.0.0', {
      compatibility: { ...manifest().compatibility, platformRange: '^1.0.0' },
    });
    await value.marketplace.publish(second, auth('publish'), 'c');
    await value.marketplace.update(installation('2.0.0', 'update'));
    const rollback = await value.marketplace.rollback({
      ...installation('1.0.0', 'rollback'),
      id: 'rollback-1',
    });
    expect(rollback.status).toBe('installed');
    expect(rollback.registration.version).toBe('1.0.0');
    expect(value.registry.history('sample-plugin', scope)).toHaveLength(3);
  });
  it('records deprecation and retirement separately from execution lifecycle', async () => {
    const value = await published();
    await value.marketplace.install(installation());
    const record = await value.marketplace.transition(
      'sample-plugin',
      '1.0.0',
      scope,
      'deprecated',
      auth('deprecate'),
      'superseded',
      at,
      'c',
    );
    expect(record).toMatchObject({ from: 'installed', to: 'deprecated' });
    expect(record).not.toHaveProperty('executionState');
  });
  it('produces correlated events, audit facts, and diagnostics', async () => {
    const value = await published();
    await value.marketplace.install(installation());
    expect(value.events.values.map((item) => item.type)).toEqual([
      'package.published',
      'package.installed',
    ]);
    expect(value.audit.values).toHaveLength(2);
    expect(value.diagnostics.list()).not.toHaveLength(0);
  });
  it('isolates publishers during publication', async () => {
    const value = fixture(),
      mismatched = buildDistributionPackage(
        manifest('1.0.0', { publisherId: 'publisher-2' }),
        publisher({ id: 'publisher-2' }),
        'artifact-1.0.0',
        at,
      );
    await expect(
      value.marketplace.publish(
        { ...mismatched, manifest: { ...mismatched.manifest, publisherId: 'publisher-1' } },
        auth('publish'),
        'c',
      ),
    ).rejects.toMatchObject({ code: 'PUBLISHER_UNKNOWN' });
  });
});
