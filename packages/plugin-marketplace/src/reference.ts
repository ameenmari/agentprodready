import type {
  CompatibilityRequest,
  CompatibilityResult,
  CompatibilityValidator,
  DependencyResult,
  DependencyValidator,
  DistributionAudit,
  DistributionDiagnostics,
  DistributionEvents,
  DistributionFact,
  DistributionPackage,
  DistributionScope,
  IntegrityResult,
  IntegrityVerifier,
  ManifestValidationResult,
  ManifestValidator,
  PackageHistoryRecord,
  PackageLifecycleRecord,
  PackageRegistration,
  PackageRegistry,
  PackageTrustResult,
  TrustEvaluator,
} from './index.js';
import { freeze, stable } from './index.js';

export class InMemoryPackageRegistry implements PackageRegistry {
  readonly #packages = new Map<string, DistributionPackage>();
  readonly #registrations: PackageRegistration[] = [];
  readonly #histories: PackageHistoryRecord[] = [];
  readonly #lifecycle: PackageLifecycleRecord[] = [];
  public publish(value: DistributionPackage): void {
    const key = this.key(value.manifest.packageId, value.manifest.version);
    if (!this.#packages.has(key)) this.#packages.set(key, freeze(clone(value)));
  }
  public package(packageId: string, version: string): DistributionPackage | undefined {
    const value = this.#packages.get(this.key(packageId, version));
    return value === undefined ? undefined : freeze(clone(value));
  }
  public versions(packageId: string): readonly DistributionPackage[] {
    return freeze(
      [...this.#packages.values()]
        .filter((value) => value.manifest.packageId === packageId)
        .sort((a, b) => compare(b.manifest.version, a.manifest.version))
        .map(clone),
    );
  }
  public all(): readonly DistributionPackage[] {
    return freeze([...this.#packages.values()].map(clone));
  }
  public register(value: PackageRegistration, history: PackageHistoryRecord): void {
    if (this.registration(value.packageId, value.version, value.scope) === undefined)
      this.#registrations.push(freeze(clone(value)));
    this.#histories.push(freeze(clone(history)));
  }
  public registration(
    packageId: string,
    version: string,
    scope: DistributionScope,
  ): PackageRegistration | undefined {
    const value = this.#registrations.find(
      (item) =>
        item.packageId === packageId && item.version === version && sameScope(item.scope, scope),
    );
    return value === undefined ? undefined : freeze(clone(value));
  }
  public installed(scope: DistributionScope): readonly PackageRegistration[] {
    return freeze(this.#registrations.filter((value) => sameScope(value.scope, scope)).map(clone));
  }
  public history(packageId: string, scope: DistributionScope): readonly PackageHistoryRecord[] {
    const versions = new Set(
      this.#registrations
        .filter((value) => value.packageId === packageId && sameScope(value.scope, scope))
        .map((value) => value.version),
    );
    return freeze(
      this.#histories
        .filter((value) => value.packageId === packageId && versions.has(value.toVersion))
        .map(clone),
    );
  }
  public lifecycle(record: PackageLifecycleRecord): void {
    this.#lifecycle.push(freeze(clone(record)));
  }
  public lifecycleHistory(packageId: string, version: string): readonly PackageLifecycleRecord[] {
    return freeze(
      this.#lifecycle
        .filter((value) => value.packageId === packageId && value.version === version)
        .map(clone),
    );
  }
  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }
}
export class DeterministicManifestValidator implements ManifestValidator {
  public validate(value: DistributionPackage): ManifestValidationResult {
    const findings: ManifestValidationResult['findings'][number][] = [];
    if (value.manifest.publisherId !== value.publisher.id)
      findings.push({ code: 'PUBLISHER_MISMATCH', message: 'Publisher mismatch', blocking: true });
    if (
      value.manifest.dependencies.some(
        (item) =>
          item.packageId === value.manifest.packageId &&
          matches(item.versionRange, value.manifest.version),
      )
    )
      findings.push({
        code: 'DEPENDENCY_CYCLE',
        message: 'Direct self dependency',
        blocking: true,
      });
    return freeze({
      id: `validation:${value.id}`,
      valid: findings.length === 0,
      findings,
      normalizedManifestDigest: value.manifestDigest,
    });
  }
}
export class StaticIntegrityVerifier implements IntegrityVerifier {
  public constructor(
    private readonly artifactDigests: Readonly<Record<string, string>>,
    private readonly invalidSignatures: ReadonlySet<string> = new Set(),
  ) {}
  public verify(value: DistributionPackage): IntegrityResult {
    const actual = this.artifactDigests[value.artifactReference] ?? 'missing',
      expected = value.manifest.integrity.digest;
    return freeze({
      valid: actual === expected,
      algorithm: value.manifest.integrity.algorithm,
      expectedDigest: expected,
      actualDigest: actual,
      signatureValid: !this.invalidSignatures.has(value.manifest.integrity.signatureReference),
      signatureReference: value.manifest.integrity.signatureReference,
    });
  }
}
export class DeterministicCompatibilityValidator implements CompatibilityValidator {
  public constructor(private readonly policyVersion = '1') {}
  public validate(pkg: DistributionPackage, request: CompatibilityRequest): CompatibilityResult {
    const platformCompatible = matches(
        pkg.manifest.compatibility.platformRange,
        request.platformVersion,
      ),
      pluginApiCompatible = matches(
        pkg.manifest.compatibility.pluginApiRange,
        request.pluginApiVersion,
      ),
      required = [
        ...pkg.manifest.compatibility.dependencyContracts,
        ...pkg.manifest.compatibility.capabilityContracts,
        ...pkg.manifest.compatibility.agentContracts,
        ...pkg.manifest.compatibility.workflowContracts,
      ],
      missingContracts = required.filter((value) => !request.availableContracts.includes(value));
    return freeze({
      compatible: platformCompatible && pluginApiCompatible && missingContracts.length === 0,
      platformCompatible,
      pluginApiCompatible,
      missingContracts,
      policyVersion: this.policyVersion,
      diagnosticsReference: `compatibility:${request.packageId}:${request.version}`,
    });
  }
}
export class RegistryDependencyValidator implements DependencyValidator {
  public constructor(private readonly registry: PackageRegistry) {}
  public validate(pkg: DistributionPackage, scope: DistributionScope): DependencyResult {
    const resolved: DependencyResult['resolved'][number][] = [],
      missing: DependencyResult['missing'][number][] = [];
    for (const dependency of pkg.manifest.dependencies) {
      const match = this.registry
        .installed(scope)
        .filter(
          (value) =>
            value.packageId === dependency.packageId &&
            matches(dependency.versionRange, value.version),
        )
        .sort((a, b) => compare(b.version, a.version))[0];
      if (match === undefined) {
        if (!dependency.optional) missing.push(dependency);
      } else resolved.push({ packageId: match.packageId, version: match.version });
    }
    return freeze({ satisfied: missing.length === 0, resolved, missing });
  }
}
export class StaticTrustEvaluator implements TrustEvaluator {
  public constructor(
    private readonly certifications: Readonly<Record<string, readonly string[]>> = {},
    private readonly policyVersion = '1',
  ) {}
  public evaluate(pkg: DistributionPackage, integrity: IntegrityResult): PackageTrustResult {
    const certificationReferences = this.certifications[pkg.id] ?? [],
      publisherVerified = pkg.publisher.verificationStatus === 'verified',
      level =
        !integrity.valid || !integrity.signatureValid
          ? 'untrusted'
          : certificationReferences.length > 0
            ? 'certified'
            : publisherVerified
              ? 'publisher-verified'
              : 'integrity-verified';
    return freeze({
      level,
      integrityVerified: integrity.valid,
      signatureVerified: integrity.signatureValid,
      publisherVerified,
      certificationReferences: [...certificationReferences],
      policyVersion: this.policyVersion,
      reasons: [level],
      authorizationImplied: false,
      activationImplied: false,
      executionImplied: false,
      safetyImplied: false,
    });
  }
}
export class InMemoryDistributionEvents implements DistributionEvents {
  public readonly values: DistributionFact[] = [];
  public async publish(value: DistributionFact): Promise<void> {
    this.values.push(freeze(clone(value)));
  }
}
export class InMemoryDistributionAudit implements DistributionAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<DistributionAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(clone(value)));
  }
}
export class InMemoryDistributionDiagnostics implements DistributionDiagnostics {
  readonly #values: unknown[] = [];
  public record(value: Parameters<DistributionDiagnostics['record']>[0]): void {
    this.#values.push(freeze(clone(value)));
  }
  public list(): readonly unknown[] {
    return freeze(clone(this.#values));
  }
}

function matches(range: string, version: string): boolean {
  return (
    range === '*' ||
    range === version ||
    (range.startsWith('^') && range.slice(1).split('.')[0] === version.split('.')[0]) ||
    (range.startsWith('>=') && compare(version, range.slice(2)) >= 0)
  );
}
function compare(a: string, b: string): number {
  const left = a.split('.').map(Number),
    right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) {
    const result = (left[index] ?? 0) - (right[index] ?? 0);
    if (result !== 0) return result;
  }
  return 0;
}
function sameScope(a: DistributionScope, b: DistributionScope): boolean {
  return a.tenantId === b.tenantId && a.workspaceId === b.workspaceId;
}
function clone<T>(value: T): T {
  return JSON.parse(stable(value)) as T;
}
