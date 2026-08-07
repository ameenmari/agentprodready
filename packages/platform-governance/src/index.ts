export interface SemanticVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}
export type ChangeKind =
  | 'contract'
  | 'ownership'
  | 'lifecycle'
  | 'behavior'
  | 'compatibility'
  | 'feature'
  | 'fix'
  | 'clarification';
export type CompatibilityCategory =
  'api' | 'sdk' | 'plugin' | 'provider' | 'workflow' | 'configuration';
export type BlueprintStatus =
  'proposed' | 'in-review' | 'approved' | 'implemented' | 'stable' | 'deprecated' | 'removed';
export type FeatureStatus =
  'proposed' | 'approved' | 'implemented' | 'stable' | 'deprecated' | 'removed';
export interface BlueprintRecord {
  readonly id: string;
  readonly title: string;
  readonly version: string;
  readonly status: BlueprintStatus;
  readonly approvalReference: string | null;
  readonly revision: number;
  readonly ownership: readonly string[];
  readonly dependencies: readonly string[];
  readonly reviewedAt: string | null;
}
export interface AdrRecord {
  readonly id: string;
  readonly title: string;
  readonly context: string;
  readonly decision: string;
  readonly rationale: string;
  readonly alternatives: readonly string[];
  readonly consequences: readonly string[];
  readonly relatedBlueprints: readonly string[];
  readonly relatedAdrs: readonly string[];
  readonly status: 'proposed' | 'accepted' | 'superseded' | 'rejected';
  readonly supersedes: string | null;
}
export interface CompatibilityAssessment {
  readonly category: CompatibilityCategory;
  readonly compatible: boolean;
  readonly previousVersion: string;
  readonly targetVersion: string;
  readonly breakingReasons: readonly string[];
}
export interface ArchitecturalChange {
  readonly id: string;
  readonly kinds: readonly ChangeKind[];
  readonly previousVersion: string;
  readonly targetVersion: string;
  readonly compatibility: readonly CompatibilityAssessment[];
  readonly migrationReference: string | null;
  readonly adrReference: string | null;
  readonly description: string;
}
export interface DeprecationRecord {
  readonly id: string;
  readonly featureId: string;
  readonly reason: string;
  readonly replacement: string;
  readonly effectiveVersion: string;
  readonly removalVersion: string;
  readonly migrationGuidance: string;
  readonly status: 'proposed' | 'approved' | 'effective' | 'removed';
}
export interface MigrationPlan {
  readonly id: string;
  readonly version: string;
  readonly category: 'blueprint' | 'platform' | 'configuration' | 'plugin' | 'provider' | 'data';
  readonly sourceVersion: string;
  readonly targetVersion: string;
  readonly steps: readonly string[];
  readonly rollbackGuidance: string;
  readonly compatibilityReference: string;
  readonly status: 'draft' | 'approved' | 'in-progress' | 'completed' | 'failed';
}
export interface ExtensionProposal {
  readonly id: string;
  readonly kind: 'plugin' | 'provider' | 'sdk' | 'cli' | 'deployment-provider';
  readonly contractReferences: readonly string[];
  readonly claimedResponsibilities: readonly string[];
  readonly publicTechnologyReferences: readonly string[];
  readonly status: 'proposed' | 'approved' | 'rejected';
}
export interface GovernanceFinding {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'information';
  readonly passed: boolean;
  readonly subjectId: string;
  readonly message: string;
}
export interface GovernanceCompliance {
  readonly compliant: boolean;
  readonly findings: readonly GovernanceFinding[];
  readonly verifiedAt: string;
}
export interface GovernanceReport {
  readonly id: string;
  readonly subjectId: string;
  readonly releaseReady: boolean;
  readonly version: string;
  readonly compliance: GovernanceCompliance;
  readonly compatibility: readonly CompatibilityAssessment[];
  readonly approvals: readonly string[];
  readonly warnings: readonly string[];
  readonly generatedAt: string;
}
export interface GovernanceEvent {
  readonly type:
    | 'blueprint.approved'
    | 'blueprint.revised'
    | 'adr.created'
    | 'version.released'
    | 'feature.deprecated'
    | 'migration.completed';
  readonly subjectId: string;
  readonly occurredAt: string;
}
export interface GovernanceEvents {
  publish(event: GovernanceEvent): void;
}
export interface GovernanceAuditReference {
  readonly action:
    | 'architectural-approval'
    | 'major-release'
    | 'breaking-change'
    | 'deprecation-approval'
    | 'governance-override';
  readonly subjectId: string;
  readonly occurredAt: string;
}
export interface GovernanceAudit {
  record(reference: GovernanceAuditReference): void;
}
export interface GovernanceDiagnostic {
  readonly operation: string;
  readonly subjectId: string;
  readonly outcome: string;
  readonly occurredAt: string;
}
export interface GovernanceDiagnostics {
  record(value: GovernanceDiagnostic): void;
}
export type GovernanceErrorCode =
  | 'VERSION_CONFLICT'
  | 'BLUEPRINT_CONFLICT'
  | 'COMPATIBILITY_VIOLATION'
  | 'GOVERNANCE_VIOLATION'
  | 'MIGRATION_FAILURE'
  | 'DEPRECATION_POLICY_VIOLATION'
  | 'EXTENSION_CONTRACT_VIOLATION';
export class GovernanceError extends Error {
  public constructor(
    public readonly code: GovernanceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GovernanceError';
  }
}
export function parseSemanticVersion(value: string): SemanticVersion {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (match === null)
    throw new GovernanceError('VERSION_CONFLICT', `Invalid semantic version: ${value}`);
  return freeze({ major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) });
}
export function compareVersions(left: string, right: string): number {
  const a = parseSemanticVersion(left),
    b = parseSemanticVersion(right);
  return Math.sign(a.major - b.major || a.minor - b.minor || a.patch - b.patch);
}
export function validateArchitecturalChange(change: ArchitecturalChange): void {
  const previous = parseSemanticVersion(change.previousVersion),
    target = parseSemanticVersion(change.targetVersion),
    breaking =
      change.kinds.some((kind) =>
        ['contract', 'ownership', 'lifecycle', 'behavior', 'compatibility'].includes(kind),
      ) || change.compatibility.some((item) => !item.compatible);
  if (compareVersions(change.previousVersion, change.targetVersion) >= 0)
    throw new GovernanceError('VERSION_CONFLICT', 'Target version must be newer.');
  if (
    breaking &&
    (target.major <= previous.major ||
      change.migrationReference === null ||
      change.compatibility.length === 0)
  )
    throw new GovernanceError(
      'COMPATIBILITY_VIOLATION',
      'Breaking changes require a major version, compatibility assessment, and migration.',
    );
  if (
    !breaking &&
    change.kinds.includes('feature') &&
    target.major === previous.major &&
    target.minor <= previous.minor
  )
    throw new GovernanceError('VERSION_CONFLICT', 'A feature requires at least a minor increment.');
  if (
    !breaking &&
    !change.kinds.includes('feature') &&
    target.major === previous.major &&
    target.minor === previous.minor &&
    target.patch <= previous.patch
  )
    throw new GovernanceError('VERSION_CONFLICT', 'A compatible fix requires a patch increment.');
}
export class BlueprintRegistry {
  private readonly histories = new Map<string, readonly Readonly<BlueprintRecord>[]>();
  public register(record: BlueprintRecord): void {
    validateBlueprint(record);
    const history = this.histories.get(record.id) ?? [],
      latest = history.at(-1);
    if (
      latest !== undefined &&
      (record.revision !== latest.revision + 1 ||
        compareVersions(latest.version, record.version) >= 0)
    )
      throw new GovernanceError('BLUEPRINT_CONFLICT', 'Blueprint revision/version must advance.');
    this.histories.set(record.id, Object.freeze([...history, freezeBlueprint(record)]));
  }
  public history(id: string): readonly Readonly<BlueprintRecord>[] {
    return this.histories.get(id) ?? Object.freeze([]);
  }
  public latest(id: string): Readonly<BlueprintRecord> {
    const value = this.histories.get(id)?.at(-1);
    if (value === undefined)
      throw new GovernanceError('BLUEPRINT_CONFLICT', `Unknown blueprint: ${id}`);
    return value;
  }
}
export class AdrRepository {
  private readonly values = new Map<string, Readonly<AdrRecord>>();
  public create(record: AdrRecord): void {
    validateAdr(record);
    if (this.values.has(record.id))
      throw new GovernanceError('GOVERNANCE_VIOLATION', `Duplicate ADR: ${record.id}`);
    this.values.set(record.id, freezeAdr(record));
  }
  public get(id: string): Readonly<AdrRecord> {
    const value = this.values.get(id);
    if (value === undefined)
      throw new GovernanceError('GOVERNANCE_VIOLATION', `Unknown ADR: ${id}`);
    return value;
  }
}
export class MigrationRegistry {
  private readonly values = new Map<string, readonly Readonly<MigrationPlan>[]>();
  public register(plan: MigrationPlan): void {
    validateMigration(plan);
    const history = this.values.get(plan.id) ?? [],
      latest = history.at(-1);
    if (latest !== undefined && compareVersions(latest.version, plan.version) >= 0)
      throw new GovernanceError('MIGRATION_FAILURE', 'Migration version must advance.');
    this.values.set(plan.id, Object.freeze([...history, freezeMigration(plan)]));
  }
  public history(id: string): readonly Readonly<MigrationPlan>[] {
    return this.values.get(id) ?? Object.freeze([]);
  }
}
export class DeprecationRegistry {
  private readonly values = new Map<string, Readonly<DeprecationRecord>>();
  public register(record: DeprecationRecord): void {
    validateDeprecation(record);
    const current = this.values.get(record.id);
    if (current !== undefined && !validDeprecationTransition(current.status, record.status))
      throw new GovernanceError('DEPRECATION_POLICY_VIOLATION', 'Invalid deprecation transition.');
    this.values.set(record.id, freeze({ ...record }));
  }
  public get(id: string): Readonly<DeprecationRecord> {
    const value = this.values.get(id);
    if (value === undefined)
      throw new GovernanceError('DEPRECATION_POLICY_VIOLATION', 'Unknown deprecation.');
    return value;
  }
}
const constitutionalOwners = Object.freeze(
  new Set([
    'runtime execution',
    'authorization',
    'provider instantiation',
    'capability resolution',
    'event transport',
    'audit persistence',
    'configuration semantics',
    'persistence',
    'deployment',
    'governance',
  ]),
);
export function validateExtension(value: ExtensionProposal): GovernanceCompliance {
  const findings: GovernanceFinding[] = [
    freeze({
      code: 'EXTENSION_CONTRACTS',
      severity: 'error',
      passed: value.contractReferences.length > 0,
      subjectId: value.id,
      message: 'Extension declares published contracts.',
    }),
    freeze({
      code: 'EXTENSION_OWNERSHIP',
      severity: 'error',
      passed: value.claimedResponsibilities.every(
        (item) => !constitutionalOwners.has(item.toLowerCase()),
      ),
      subjectId: value.id,
      message: 'Extension does not redefine constitutional ownership.',
    }),
    freeze({
      code: 'TECHNOLOGY_INDEPENDENCE',
      severity: 'error',
      passed: value.publicTechnologyReferences.length === 0,
      subjectId: value.id,
      message: 'Public extension contracts are technology-independent.',
    }),
  ];
  return freeze({
    compliant: findings.every((item) => item.passed),
    findings: Object.freeze(findings),
    verifiedAt: 'deterministic',
  });
}
export interface GovernanceValidatorDependencies {
  readonly events: GovernanceEvents;
  readonly audit: GovernanceAudit;
  readonly diagnostics: GovernanceDiagnostics;
  readonly now: () => Date;
}
export class GovernanceValidator {
  public constructor(private readonly dependencies: GovernanceValidatorDependencies) {}
  public validateRelease(
    change: ArchitecturalChange,
    extensions: readonly ExtensionProposal[] = [],
  ): GovernanceCompliance {
    const findings: GovernanceFinding[] = [];
    try {
      validateArchitecturalChange(change);
      findings.push(this.finding('VERSIONING', true, change.id, 'Version rules satisfied.'));
    } catch (error: unknown) {
      findings.push(
        this.finding(
          'VERSIONING',
          false,
          change.id,
          error instanceof Error ? error.message : 'Version validation failed.',
        ),
      );
    }
    for (const extension of extensions) findings.push(...validateExtension(extension).findings);
    const compliance = freeze({
      compliant: findings.every((item) => item.passed),
      findings: Object.freeze(findings),
      verifiedAt: this.dependencies.now().toISOString(),
    });
    this.dependencies.diagnostics.record(
      freeze({
        operation: 'release-validation',
        subjectId: change.id,
        outcome: compliance.compliant ? 'passed' : 'failed',
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
    if (compliance.compliant) {
      this.dependencies.events.publish(
        freeze({
          type: 'version.released',
          subjectId: change.id,
          occurredAt: this.dependencies.now().toISOString(),
        }),
      );
      if (
        change.kinds.some((kind) =>
          ['contract', 'ownership', 'lifecycle', 'behavior', 'compatibility'].includes(kind),
        )
      ) {
        this.dependencies.audit.record(
          freeze({
            action: 'breaking-change',
            subjectId: change.id,
            occurredAt: this.dependencies.now().toISOString(),
          }),
        );
        this.dependencies.audit.record(
          freeze({
            action: 'major-release',
            subjectId: change.id,
            occurredAt: this.dependencies.now().toISOString(),
          }),
        );
      }
    }
    return compliance;
  }
  private finding(
    code: string,
    passed: boolean,
    subjectId: string,
    message: string,
  ): GovernanceFinding {
    return freeze({ code, severity: 'error', passed, subjectId, message });
  }
}
export class GovernanceReportingEngine {
  public constructor(private readonly now: () => Date) {}
  public build(
    id: string,
    subjectId: string,
    version: string,
    compliance: GovernanceCompliance,
    compatibility: readonly CompatibilityAssessment[],
    approvals: readonly string[],
  ): GovernanceReport {
    return freeze({
      id,
      subjectId,
      releaseReady:
        compliance.compliant &&
        compatibility.every(
          (item) =>
            item.compatible ||
            parseSemanticVersion(version).major > parseSemanticVersion(item.previousVersion).major,
        ) &&
        approvals.length > 0,
      version,
      compliance,
      compatibility: Object.freeze([...compatibility]),
      approvals: Object.freeze([...approvals]),
      warnings: Object.freeze(
        compliance.findings
          .filter((item) => item.severity === 'warning' || !item.passed)
          .map((item) => item.message),
      ),
      generatedAt: this.now().toISOString(),
    });
  }
}
export function validateBlueprint(value: BlueprintRecord): void {
  parseSemanticVersion(value.version);
  if (
    value.id.trim() === '' ||
    value.title.trim() === '' ||
    value.revision < 1 ||
    value.ownership.length === 0 ||
    (value.status === 'approved' && value.approvalReference === null)
  )
    throw new GovernanceError('BLUEPRINT_CONFLICT', 'Blueprint record is invalid.');
}
export function validateAdr(value: AdrRecord): void {
  if (
    value.id.trim() === '' ||
    value.title.trim() === '' ||
    value.context.trim() === '' ||
    value.decision.trim() === '' ||
    value.rationale.trim() === '' ||
    value.alternatives.length === 0 ||
    value.consequences.length === 0 ||
    value.relatedBlueprints.length === 0
  )
    throw new GovernanceError('GOVERNANCE_VIOLATION', 'ADR record is incomplete.');
}
export function validateMigration(value: MigrationPlan): void {
  parseSemanticVersion(value.version);
  if (
    compareVersions(value.sourceVersion, value.targetVersion) >= 0 ||
    value.steps.length === 0 ||
    value.rollbackGuidance.trim() === '' ||
    value.compatibilityReference.trim() === ''
  )
    throw new GovernanceError('MIGRATION_FAILURE', 'Migration plan is invalid.');
}
export function validateDeprecation(value: DeprecationRecord): void {
  if (
    value.reason.trim() === '' ||
    value.replacement.trim() === '' ||
    value.migrationGuidance.trim() === '' ||
    compareVersions(value.effectiveVersion, value.removalVersion) >= 0
  )
    throw new GovernanceError('DEPRECATION_POLICY_VIOLATION', 'Deprecation record is invalid.');
}
function validDeprecationTransition(
  from: DeprecationRecord['status'],
  to: DeprecationRecord['status'],
): boolean {
  return (
    (
      {
        proposed: 'approved',
        approved: 'effective',
        effective: 'removed',
        removed: 'removed',
      } as const
    )[from] === to
  );
}
function freezeBlueprint(value: BlueprintRecord): Readonly<BlueprintRecord> {
  return freeze({
    ...value,
    ownership: Object.freeze([...value.ownership]),
    dependencies: Object.freeze([...value.dependencies]),
  });
}
function freezeAdr(value: AdrRecord): Readonly<AdrRecord> {
  return freeze({
    ...value,
    alternatives: Object.freeze([...value.alternatives]),
    consequences: Object.freeze([...value.consequences]),
    relatedBlueprints: Object.freeze([...value.relatedBlueprints]),
    relatedAdrs: Object.freeze([...value.relatedAdrs]),
  });
}
function freezeMigration(value: MigrationPlan): Readonly<MigrationPlan> {
  return freeze({ ...value, steps: Object.freeze([...value.steps]) });
}
function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}
export * from './reference.js';
