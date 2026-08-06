export type PackageKind =
  | 'plugin'
  | 'tool-adapter'
  | 'ai-provider-adapter'
  | 'memory-provider'
  | 'knowledge-provider'
  | 'event-subscriber'
  | 'agent-definition'
  | 'workflow-template'
  | 'shared-library'
  | 'configuration-asset';
export type PackageLifecycleState =
  | 'draft'
  | 'published'
  | 'verified'
  | 'available'
  | 'installed'
  | 'updated'
  | 'deprecated'
  | 'retired';
export type DistributionOperation =
  'publish' | 'discover' | 'install' | 'update' | 'rollback' | 'deprecate' | 'retire';
export interface DistributionScope {
  readonly tenantId: string;
  readonly workspaceId?: string;
}
export interface PublisherIdentity {
  readonly id: string;
  readonly organization: string;
  readonly signingIdentityReference: string;
  readonly contactReference: string;
  readonly verificationStatus: 'unverified' | 'verified' | 'suspended' | 'revoked';
  readonly verificationReference?: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly identityVersion: string;
  readonly trustImplied: false;
}
export interface PackageDependency {
  readonly packageId: string;
  readonly versionRange: string;
  readonly optional: boolean;
  readonly contractReferences: readonly string[];
}
export interface PackageCompatibility {
  readonly platformRange: string;
  readonly pluginApiRange: string;
  readonly dependencyContracts: readonly string[];
  readonly capabilityContracts: readonly string[];
  readonly agentContracts: readonly string[];
  readonly workflowContracts: readonly string[];
}
export interface PackageManifest {
  readonly packageId: string;
  readonly version: string;
  readonly kind: PackageKind;
  readonly publisherId: string;
  readonly name: string;
  readonly description: string;
  readonly categories: readonly string[];
  readonly dependencies: readonly PackageDependency[];
  readonly compatibility: PackageCompatibility;
  readonly capabilitiesProvided: readonly string[];
  readonly capabilitiesRequired: readonly string[];
  readonly contentReference: string;
  readonly integrity: Readonly<{
    algorithm: 'sha256' | 'sha512';
    digest: string;
    signatureReference: string;
  }>;
  readonly license: Readonly<{ spdxId: string; noticeReference?: string }>;
  readonly governance: Readonly<{
    owner: string;
    policyVersion: string;
    classification: 'public' | 'internal' | 'confidential' | 'restricted';
  }>;
  readonly schemaVersion: string;
}
export interface DistributionPackage {
  readonly id: string;
  readonly manifest: PackageManifest;
  readonly publisher: PublisherIdentity;
  readonly artifactReference: string;
  readonly manifestDigest: string;
  readonly publishedAt: string;
  readonly immutable: true;
}
export interface DistributionAuthorization {
  readonly decisionId: string;
  readonly principalId: string;
  readonly operation: DistributionOperation;
  readonly authorized: boolean;
  readonly state: 'active' | 'expired' | 'revoked' | 'superseded';
  readonly scope: DistributionScope;
  readonly policyVersion: string;
  readonly restrictions: readonly string[];
}
export interface ManifestValidationResult {
  readonly id: string;
  readonly valid: boolean;
  readonly findings: readonly Readonly<{ code: string; message: string; blocking: boolean }>[];
  readonly normalizedManifestDigest: string;
}
export interface IntegrityResult {
  readonly valid: boolean;
  readonly algorithm: string;
  readonly expectedDigest: string;
  readonly actualDigest: string;
  readonly signatureValid: boolean;
  readonly signatureReference: string;
}
export interface CompatibilityRequest {
  readonly packageId: string;
  readonly version: string;
  readonly platformVersion: string;
  readonly pluginApiVersion: string;
  readonly availableContracts: readonly string[];
}
export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly platformCompatible: boolean;
  readonly pluginApiCompatible: boolean;
  readonly missingContracts: readonly string[];
  readonly policyVersion: string;
  readonly diagnosticsReference: string;
}
export interface DependencyResult {
  readonly satisfied: boolean;
  readonly resolved: readonly Readonly<{ packageId: string; version: string }>[];
  readonly missing: readonly PackageDependency[];
}
export interface PackageTrustResult {
  readonly level: 'untrusted' | 'integrity-verified' | 'publisher-verified' | 'certified';
  readonly integrityVerified: boolean;
  readonly signatureVerified: boolean;
  readonly publisherVerified: boolean;
  readonly certificationReferences: readonly string[];
  readonly policyVersion: string;
  readonly reasons: readonly string[];
  readonly authorizationImplied: false;
  readonly activationImplied: false;
  readonly executionImplied: false;
  readonly safetyImplied: false;
}
export interface PackageRegistration {
  readonly id: string;
  readonly packageId: string;
  readonly version: string;
  readonly scope: DistributionScope;
  readonly manifestDigest: string;
  readonly publisherId: string;
  readonly installedAt: string;
  readonly installedBy: string;
  readonly authorizationDecisionId: string;
  readonly trust: PackageTrustResult;
  readonly compatibility: CompatibilityResult;
  readonly immutable: true;
  readonly activationPerformed: false;
  readonly executionPerformed: false;
  readonly codeLoaded: false;
}
export interface PackageHistoryRecord {
  readonly id: string;
  readonly packageId: string;
  readonly fromVersion?: string;
  readonly toVersion: string;
  readonly operation: 'install' | 'update' | 'rollback';
  readonly policy: Readonly<{
    type: 'manual' | 'approved-automatic' | 'pinned' | 'canary';
    version: string;
  }>;
  readonly authorizationDecisionId: string;
  readonly principalId: string;
  readonly occurredAt: string;
  readonly previousRecordId?: string;
}
export interface PackageLifecycleRecord {
  readonly id: string;
  readonly packageId: string;
  readonly version: string;
  readonly from: PackageLifecycleState;
  readonly to: PackageLifecycleState;
  readonly reason: string;
  readonly authorizationDecisionId: string;
  readonly occurredAt: string;
}
export interface PackageRegistry {
  publish(value: DistributionPackage): void;
  package(packageId: string, version: string): DistributionPackage | undefined;
  versions(packageId: string): readonly DistributionPackage[];
  all(): readonly DistributionPackage[];
  register(value: PackageRegistration, history: PackageHistoryRecord): void;
  registration(
    packageId: string,
    version: string,
    scope: DistributionScope,
  ): PackageRegistration | undefined;
  installed(scope: DistributionScope): readonly PackageRegistration[];
  history(packageId: string, scope: DistributionScope): readonly PackageHistoryRecord[];
  lifecycle(record: PackageLifecycleRecord): void;
  lifecycleHistory(packageId: string, version: string): readonly PackageLifecycleRecord[];
}
export interface ManifestValidator {
  validate(value: DistributionPackage): ManifestValidationResult;
}
export interface IntegrityVerifier {
  verify(value: DistributionPackage): IntegrityResult;
}
export interface CompatibilityValidator {
  validate(pkg: DistributionPackage, request: CompatibilityRequest): CompatibilityResult;
}
export interface DependencyValidator {
  validate(pkg: DistributionPackage, scope: DistributionScope): DependencyResult;
}
export interface TrustEvaluator {
  evaluate(pkg: DistributionPackage, integrity: IntegrityResult): PackageTrustResult;
}
export interface PackageDiscoveryRequest {
  readonly id: string;
  readonly scope: DistributionScope;
  readonly authorization: DistributionAuthorization;
  readonly text?: string;
  readonly categories: readonly string[];
  readonly capabilities: readonly string[];
  readonly publisherIds: readonly string[];
  readonly compatibleWith?: CompatibilityRequest;
  readonly installedOnly: boolean;
  readonly limit: number;
  readonly cursor?: string;
}
export interface PackageDiscoveryResult {
  readonly requestId: string;
  readonly packages: readonly Readonly<{
    packageId: string;
    version: string;
    kind: PackageKind;
    publisherId: string;
    name: string;
    categories: readonly string[];
    capabilities: readonly string[];
    installed: boolean;
    installationAuthorized: false;
    executionAuthorized: false;
  }>[];
  readonly nextCursor?: string;
  readonly diagnosticsReference: string;
}
export interface InstallationRequest {
  readonly id: string;
  readonly packageId: string;
  readonly version: string;
  readonly scope: DistributionScope;
  readonly platformVersion: string;
  readonly pluginApiVersion: string;
  readonly availableContracts: readonly string[];
  readonly authorization: DistributionAuthorization;
  readonly policy: Readonly<{
    type: 'manual' | 'approved-automatic' | 'pinned' | 'canary';
    version: string;
  }>;
  readonly occurredAt: string;
  readonly correlationId: string;
}
export interface PackageInstallationResult {
  readonly requestId: string;
  readonly status: 'installed' | 'already-installed';
  readonly registration: PackageRegistration;
  readonly history: PackageHistoryRecord;
  readonly validation: ManifestValidationResult;
  readonly integrity: IntegrityResult;
  readonly dependencies: DependencyResult;
  readonly trust: PackageTrustResult;
  readonly activationPerformed: false;
  readonly executionPerformed: false;
  readonly codeLoaded: false;
  readonly diagnosticsReference: string;
}
export interface DistributionFact {
  readonly type:
    | 'package.published'
    | 'package.verified'
    | 'package.installed'
    | 'package.updated'
    | 'package.rollback'
    | 'package.deprecated'
    | 'package.retired'
    | 'package.compatibility-failed';
  readonly packageId: string;
  readonly version: string;
  readonly operationId: string;
  readonly tenantId: string;
  readonly correlationId: string;
  readonly outcome: 'completed' | 'rejected';
  readonly diagnosticsReference: string;
}
export interface DistributionEvents {
  publish(value: DistributionFact): Promise<void>;
}
export interface DistributionAudit {
  record(
    value: Readonly<{
      type: string;
      packageId: string;
      version: string;
      publisherId: string;
      principalId: string;
      authorizationDecisionId: string;
      operationId: string;
      correlationId: string;
    }>,
  ): Promise<void>;
}
export interface DistributionDiagnostics {
  record(
    value: Readonly<{
      id: string;
      phase: string;
      outcome: 'completed' | 'failed';
      packageId: string;
      version?: string;
      policyVersions: readonly string[];
      errorCode?: DistributionErrorCode;
    }>,
  ): void;
  list(): readonly unknown[];
}
export type DistributionErrorCode =
  | 'PACKAGE_INVALID'
  | 'SIGNATURE_INVALID'
  | 'PUBLISHER_UNKNOWN'
  | 'COMPATIBILITY_FAILED'
  | 'DEPENDENCY_MISSING'
  | 'INSTALLATION_FAILED'
  | 'UPDATE_FAILED'
  | 'ROLLBACK_FAILED'
  | 'TRUST_EVALUATION_FAILED'
  | 'PACKAGE_NOT_FOUND'
  | 'PACKAGE_UNAUTHORIZED'
  | 'PUBLISHER_SCOPE_VIOLATION';
export class DistributionError extends Error {
  public constructor(
    public readonly code: DistributionErrorCode,
    message: string,
    public readonly diagnosticId: string,
  ) {
    super(message);
    this.name = 'DistributionError';
  }
}

export function buildDistributionPackage(
  manifest: PackageManifest,
  publisher: PublisherIdentity,
  artifactReference: string,
  publishedAt: string,
): DistributionPackage {
  validateManifest(manifest, publisher, artifactReference);
  const normalized = clone(manifest),
    digest = hash(stable(normalized));
  return freeze({
    id: `package:${manifest.packageId}:${manifest.version}:${digest}`,
    manifest: normalized,
    publisher: clone(publisher),
    artifactReference,
    manifestDigest: digest,
    publishedAt,
    immutable: true,
  });
}
export class PluginMarketplace {
  public constructor(
    private readonly registry: PackageRegistry,
    private readonly manifests: ManifestValidator,
    private readonly integrity: IntegrityVerifier,
    private readonly compatibility: CompatibilityValidator,
    private readonly dependencies: DependencyValidator,
    private readonly trust: TrustEvaluator,
    private readonly events: DistributionEvents,
    private readonly audit: DistributionAudit,
    private readonly diagnostics: DistributionDiagnostics,
  ) {}
  public async publish(
    pkg: DistributionPackage,
    authorization: DistributionAuthorization,
    correlationId: string,
  ): Promise<void> {
    enforce(
      authorization,
      'publish',
      { tenantId: authorization.scope.tenantId },
      `distribution:publish:${pkg.manifest.packageId}`,
    );
    if (pkg.publisher.id !== pkg.manifest.publisherId)
      throw new DistributionError(
        'PUBLISHER_UNKNOWN',
        'Publisher does not match manifest',
        `distribution:publish:${pkg.manifest.packageId}`,
      );
    this.registry.publish(pkg);
    await this.fact('package.published', pkg, authorization, correlationId, pkg.id);
  }
  public discover(request: PackageDiscoveryRequest): PackageDiscoveryResult {
    enforce(
      request.authorization,
      'discover',
      request.scope,
      `distribution:discover:${request.id}`,
    );
    if (request.limit < 1)
      throw new DistributionError(
        'PACKAGE_INVALID',
        'Discovery limit is invalid',
        `distribution:discover:${request.id}`,
      );
    const installed = new Set(
      this.registry.installed(request.scope).map((value) => `${value.packageId}@${value.version}`),
    );
    const values = this.registry
      .all()
      .filter(
        (pkg) =>
          (request.text === undefined ||
            `${pkg.manifest.name} ${pkg.manifest.description}`
              .toLowerCase()
              .includes(request.text.toLowerCase())) &&
          (request.categories.length === 0 ||
            request.categories.some((value) => pkg.manifest.categories.includes(value))) &&
          (request.capabilities.length === 0 ||
            request.capabilities.every((value) =>
              pkg.manifest.capabilitiesProvided.includes(value),
            )) &&
          (request.publisherIds.length === 0 || request.publisherIds.includes(pkg.publisher.id)) &&
          (!request.installedOnly ||
            installed.has(`${pkg.manifest.packageId}@${pkg.manifest.version}`)) &&
          (request.compatibleWith === undefined ||
            this.compatibility.validate(pkg, {
              ...request.compatibleWith,
              packageId: pkg.manifest.packageId,
              version: pkg.manifest.version,
            }).compatible),
      )
      .sort(
        (a, b) =>
          a.manifest.packageId.localeCompare(b.manifest.packageId) ||
          compareVersions(b.manifest.version, a.manifest.version),
      );
    const offset = Number.parseInt(request.cursor ?? '0', 10),
      selected = values.slice(offset, offset + request.limit),
      next =
        offset + selected.length < values.length ? String(offset + selected.length) : undefined;
    return freeze({
      requestId: request.id,
      packages: selected.map((pkg) => ({
        packageId: pkg.manifest.packageId,
        version: pkg.manifest.version,
        kind: pkg.manifest.kind,
        publisherId: pkg.publisher.id,
        name: pkg.manifest.name,
        categories: [...pkg.manifest.categories],
        capabilities: [...pkg.manifest.capabilitiesProvided],
        installed: installed.has(`${pkg.manifest.packageId}@${pkg.manifest.version}`),
        installationAuthorized: false as const,
        executionAuthorized: false as const,
      })),
      ...(next === undefined ? {} : { nextCursor: next }),
      diagnosticsReference: `distribution:discover:${request.id}`,
    });
  }
  public async install(request: InstallationRequest): Promise<PackageInstallationResult> {
    return this.installOperation(request, 'install');
  }
  public async update(request: InstallationRequest): Promise<PackageInstallationResult> {
    return this.installOperation(request, 'update');
  }
  public async rollback(request: InstallationRequest): Promise<PackageInstallationResult> {
    return this.installOperation(request, 'rollback');
  }
  public async transition(
    packageId: string,
    version: string,
    scope: DistributionScope,
    to: 'deprecated' | 'retired',
    authorization: DistributionAuthorization,
    reason: string,
    at: string,
    correlationId: string,
  ): Promise<PackageLifecycleRecord> {
    enforce(
      authorization,
      to === 'deprecated' ? 'deprecate' : 'retire',
      scope,
      `distribution:lifecycle:${packageId}`,
    );
    const registration = this.registry.registration(packageId, version, scope);
    if (registration === undefined)
      throw new DistributionError(
        'PACKAGE_NOT_FOUND',
        'Installed package not found',
        `distribution:lifecycle:${packageId}`,
      );
    const record = freeze({
      id: `lifecycle:${registration.id}:${to}`,
      packageId,
      version,
      from: 'installed' as const,
      to,
      reason,
      authorizationDecisionId: authorization.decisionId,
      occurredAt: at,
    });
    this.registry.lifecycle(record);
    const pkg = this.required(packageId, version);
    await this.fact(
      to === 'deprecated' ? 'package.deprecated' : 'package.retired',
      pkg,
      authorization,
      correlationId,
      record.id,
    );
    return record;
  }
  private async installOperation(
    request: InstallationRequest,
    operation: 'install' | 'update' | 'rollback',
  ): Promise<PackageInstallationResult> {
    enforce(
      request.authorization,
      operation,
      request.scope,
      `distribution:${operation}:${request.id}`,
    );
    const pkg = this.required(request.packageId, request.version),
      validation = this.manifests.validate(pkg);
    if (!validation.valid) throw this.error(pkg, 'PACKAGE_INVALID', 'manifest');
    const integrity = this.integrity.verify(pkg);
    if (!integrity.valid || !integrity.signatureValid)
      throw this.error(pkg, 'SIGNATURE_INVALID', 'integrity');
    const compatibility = this.compatibility.validate(pkg, {
      packageId: pkg.manifest.packageId,
      version: pkg.manifest.version,
      platformVersion: request.platformVersion,
      pluginApiVersion: request.pluginApiVersion,
      availableContracts: request.availableContracts,
    });
    if (!compatibility.compatible) throw this.error(pkg, 'COMPATIBILITY_FAILED', 'compatibility');
    const dependencies = this.dependencies.validate(pkg, request.scope);
    if (!dependencies.satisfied) throw this.error(pkg, 'DEPENDENCY_MISSING', 'dependency');
    const trust = this.trust.evaluate(pkg, integrity);
    if (trust.level === 'untrusted') throw this.error(pkg, 'TRUST_EVALUATION_FAILED', 'trust');
    const existing = this.registry.registration(
      pkg.manifest.packageId,
      pkg.manifest.version,
      request.scope,
    );
    if (existing !== undefined && operation === 'install') {
      const history = this.registry
        .history(pkg.manifest.packageId, request.scope)
        .find((value) => value.toVersion === pkg.manifest.version);
      if (history === undefined) throw this.error(pkg, 'INSTALLATION_FAILED', 'history');
      return this.installResult(
        request,
        'already-installed',
        existing,
        history,
        validation,
        integrity,
        dependencies,
        trust,
      );
    }
    const previous = this.registry.history(pkg.manifest.packageId, request.scope).at(-1),
      registration =
        existing ??
        freeze({
          id: `installation:${pkg.manifest.packageId}:${pkg.manifest.version}:${request.scope.tenantId}`,
          packageId: pkg.manifest.packageId,
          version: pkg.manifest.version,
          scope: clone(request.scope),
          manifestDigest: pkg.manifestDigest,
          publisherId: pkg.publisher.id,
          installedAt: request.occurredAt,
          installedBy: request.authorization.principalId,
          authorizationDecisionId: request.authorization.decisionId,
          trust,
          compatibility,
          immutable: true as const,
          activationPerformed: false as const,
          executionPerformed: false as const,
          codeLoaded: false as const,
        }),
      history = freeze({
        id: `history:${request.id}`,
        packageId: pkg.manifest.packageId,
        ...(previous === undefined ? {} : { fromVersion: previous.toVersion }),
        toVersion: pkg.manifest.version,
        operation,
        policy: clone(request.policy),
        authorizationDecisionId: request.authorization.decisionId,
        principalId: request.authorization.principalId,
        occurredAt: request.occurredAt,
        ...(previous === undefined ? {} : { previousRecordId: previous.id }),
      });
    this.registry.register(registration, history);
    await this.fact(
      operation === 'install'
        ? 'package.installed'
        : operation === 'update'
          ? 'package.updated'
          : 'package.rollback',
      pkg,
      request.authorization,
      request.correlationId,
      request.id,
    );
    return this.installResult(
      request,
      'installed',
      registration,
      history,
      validation,
      integrity,
      dependencies,
      trust,
    );
  }
  private installResult(
    request: InstallationRequest,
    status: PackageInstallationResult['status'],
    registration: PackageRegistration,
    history: PackageHistoryRecord,
    validation: ManifestValidationResult,
    integrity: IntegrityResult,
    dependencies: DependencyResult,
    trust: PackageTrustResult,
  ): PackageInstallationResult {
    return freeze({
      requestId: request.id,
      status,
      registration,
      history,
      validation,
      integrity,
      dependencies,
      trust,
      activationPerformed: false,
      executionPerformed: false,
      codeLoaded: false,
      diagnosticsReference: `distribution:${request.id}`,
    });
  }
  private required(id: string, version: string): DistributionPackage {
    const pkg = this.registry.package(id, version);
    if (pkg === undefined)
      throw new DistributionError(
        'PACKAGE_NOT_FOUND',
        'Package not found',
        `distribution:${id}:${version}`,
      );
    return pkg;
  }
  private error(
    pkg: DistributionPackage,
    code: DistributionErrorCode,
    phase: string,
  ): DistributionError {
    this.diagnostics.record({
      id: `distribution:${pkg.id}:${phase}`,
      phase,
      outcome: 'failed',
      packageId: pkg.manifest.packageId,
      version: pkg.manifest.version,
      policyVersions: [pkg.manifest.governance.policyVersion],
      errorCode: code,
    });
    return new DistributionError(
      code,
      code.replaceAll('_', ' '),
      `distribution:${pkg.id}:${phase}`,
    );
  }
  private async fact(
    type: DistributionFact['type'],
    pkg: DistributionPackage,
    authorization: DistributionAuthorization,
    correlationId: string,
    operationId: string,
  ): Promise<void> {
    const diagnostic = `distribution:${operationId}`;
    await this.events.publish({
      type,
      packageId: pkg.manifest.packageId,
      version: pkg.manifest.version,
      operationId,
      tenantId: authorization.scope.tenantId,
      correlationId,
      outcome: 'completed',
      diagnosticsReference: diagnostic,
    });
    await this.audit.record({
      type,
      packageId: pkg.manifest.packageId,
      version: pkg.manifest.version,
      publisherId: pkg.publisher.id,
      principalId: authorization.principalId,
      authorizationDecisionId: authorization.decisionId,
      operationId,
      correlationId,
    });
    this.diagnostics.record({
      id: diagnostic,
      phase: type,
      outcome: 'completed',
      packageId: pkg.manifest.packageId,
      version: pkg.manifest.version,
      policyVersions: [authorization.policyVersion, pkg.manifest.governance.policyVersion],
    });
  }
}

function validateManifest(
  value: PackageManifest,
  publisher: PublisherIdentity,
  artifact: string,
): void {
  if (
    !/^[a-z][a-z0-9-]{2,63}$/.test(value.packageId) ||
    !semver(value.version) ||
    value.publisherId !== publisher.id ||
    value.name.trim() === '' ||
    value.description.trim() === '' ||
    artifact.trim() === '' ||
    value.contentReference.trim() === '' ||
    value.integrity.digest.trim() === '' ||
    value.integrity.signatureReference.trim() === '' ||
    value.dependencies.some(
      (item) => item.packageId === value.packageId && item.versionRange === value.version,
    )
  )
    throw new DistributionError(
      'PACKAGE_INVALID',
      'Package Manifest is invalid',
      `distribution:manifest:${value.packageId}`,
    );
  if (
    /password|secretValue|accessToken|privateKey|runtimeState|executionContext|retryState|providerCredential/i.test(
      stable(value),
    )
  )
    throw new DistributionError(
      'PACKAGE_INVALID',
      'Manifest contains forbidden content',
      `distribution:manifest:${value.packageId}`,
    );
}
function enforce(
  value: DistributionAuthorization,
  operation: DistributionOperation,
  scope: DistributionScope,
  id: string,
): void {
  if (!value.authorized || value.state !== 'active' || value.operation !== operation)
    throw new DistributionError(
      'PACKAGE_UNAUTHORIZED',
      'Distribution operation is unauthorized',
      id,
    );
  if (
    value.scope.tenantId !== scope.tenantId ||
    (scope.workspaceId !== undefined && value.scope.workspaceId !== scope.workspaceId)
  )
    throw new DistributionError(
      'PUBLISHER_SCOPE_VIOLATION',
      'Distribution scope is unauthorized',
      id,
    );
}
export function stable(value: unknown): string {
  return JSON.stringify(sort(value));
}
function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort);
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sort(item)]),
    );
  return value;
}
function hash(value: string): string {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16);
}
function semver(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number),
    right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export * from './reference.js';
