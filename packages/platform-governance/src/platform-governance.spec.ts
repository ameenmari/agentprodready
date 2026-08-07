import { describe, expect, it } from 'vitest';
import {
  AdrRepository,
  BlueprintRegistry,
  compareVersions,
  DeprecationRegistry,
  GovernanceError,
  GovernanceReportingEngine,
  GovernanceValidator,
  InMemoryGovernanceAudit,
  InMemoryGovernanceDiagnostics,
  InMemoryGovernanceEvents,
  MigrationRegistry,
  parseSemanticVersion,
  validateArchitecturalChange,
  validateExtension,
  type AdrRecord,
  type ArchitecturalChange,
  type BlueprintRecord,
  type CompatibilityAssessment,
  type DeprecationRecord,
  type ExtensionProposal,
  type MigrationPlan,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z',
  compatibility = (compatible = true): CompatibilityAssessment => ({
    category: 'api',
    compatible,
    previousVersion: '1.0.0',
    targetVersion: compatible ? '1.1.0' : '2.0.0',
    breakingReasons: compatible ? [] : ['removed field'],
  }),
  change = (overrides: Partial<ArchitecturalChange> = {}): ArchitecturalChange => ({
    id: 'change:1',
    kinds: ['feature'],
    previousVersion: '1.0.0',
    targetVersion: '1.1.0',
    compatibility: [compatibility()],
    migrationReference: null,
    adrReference: null,
    description: 'compatible feature',
    ...overrides,
  }),
  blueprint = (overrides: Partial<BlueprintRecord> = {}): BlueprintRecord => ({
    id: '31',
    title: 'Governance',
    version: '2.0.0',
    status: 'approved',
    approvalReference: 'approval:31',
    revision: 1,
    ownership: ['governance'],
    dependencies: Array.from({ length: 30 }, (_, index) => String(index + 1).padStart(2, '0')),
    reviewedAt: at,
    ...overrides,
  }),
  adr: AdrRecord = {
    id: 'ADR-016',
    title: 'Governance',
    context: 'Architecture evolves.',
    decision: 'Use governed changes.',
    rationale: 'Preserve integrity.',
    alternatives: ['undocumented changes'],
    consequences: ['traceability'],
    relatedBlueprints: ['31'],
    relatedAdrs: ['ADR-014'],
    status: 'accepted',
    supersedes: null,
  };
describe('semantic versions, blueprints, ADRs, and changes', () => {
  it('parses and compares semantic versions deterministically', () => {
    expect(parseSemanticVersion('2.10.3')).toEqual({ major: 2, minor: 10, patch: 3 });
    expect(compareVersions('1.9.0', '1.10.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
    expect(() => parseSemanticVersion('01.0.0')).toThrowError(GovernanceError);
  });
  it('requires explicit major versions assessments and migrations for breaking changes', () => {
    const breaking = change({
      kinds: ['contract'],
      targetVersion: '2.0.0',
      compatibility: [compatibility(false)],
      migrationReference: 'migration:1',
      adrReference: 'ADR-016',
    });
    expect(() => {
      validateArchitecturalChange(breaking);
    }).not.toThrow();
    expect(() => {
      validateArchitecturalChange({ ...breaking, targetVersion: '1.1.0' });
    }).toThrowError(GovernanceError);
    expect(() => {
      validateArchitecturalChange({ ...breaking, migrationReference: null });
    }).toThrowError(GovernanceError);
  });
  it('requires minor features and patch-compatible fixes', () => {
    expect(() => {
      validateArchitecturalChange(change());
    }).not.toThrow();
    expect(() => {
      validateArchitecturalChange(change({ targetVersion: '1.0.1' }));
    }).toThrowError(GovernanceError);
    expect(() => {
      validateArchitecturalChange(change({ kinds: ['fix'], targetVersion: '1.0.1' }));
    }).not.toThrow();
  });
  it('preserves immutable traceable blueprint revision history', () => {
    const registry = new BlueprintRegistry();
    registry.register(blueprint());
    registry.register(blueprint({ version: '2.1.0', revision: 2, status: 'implemented' }));
    expect(registry.history('31').map((item) => item.version)).toEqual(['2.0.0', '2.1.0']);
    expect(Object.isFrozen(registry.latest('31'))).toBe(true);
    expect(() => {
      registry.register(blueprint({ version: '2.1.1', revision: 2 }));
    }).toThrowError(GovernanceError);
  });
  it('validates and preserves complete ADRs', () => {
    const repository = new AdrRepository();
    repository.create(adr);
    expect(repository.get('ADR-016')).toEqual(adr);
    expect(Object.isFrozen(repository.get('ADR-016'))).toBe(true);
    expect(() => {
      repository.create(adr);
    }).toThrowError(GovernanceError);
    expect(() => {
      new AdrRepository().create({ ...adr, context: '' });
    }).toThrowError(GovernanceError);
  });
});
describe('migrations, deprecation, extensions, compliance, and reports', () => {
  it('keeps versioned migration plans traceable', () => {
    const registry = new MigrationRegistry(),
      base: MigrationPlan = {
        id: 'migration:1',
        version: '1.0.0',
        category: 'api' as never,
        sourceVersion: '1.0.0',
        targetVersion: '2.0.0',
        steps: ['adopt new field'],
        rollbackGuidance: 'restore v1',
        compatibilityReference: 'compatibility:1',
        status: 'approved',
      };
    const valid = { ...base, category: 'platform' as const };
    registry.register(valid);
    registry.register({ ...valid, version: '1.1.0', status: 'completed' });
    expect(registry.history('migration:1').map((item) => item.status)).toEqual([
      'approved',
      'completed',
    ]);
    expect(() => {
      registry.register({ ...valid, version: '1.0.1' });
    }).toThrowError(GovernanceError);
  });
  it('governs deprecation through ordered versions and workflow', () => {
    const registry = new DeprecationRegistry(),
      record: DeprecationRecord = {
        id: 'deprecation:1',
        featureId: 'feature:old',
        reason: 'superseded',
        replacement: 'feature:new',
        effectiveVersion: '2.0.0',
        removalVersion: '3.0.0',
        migrationGuidance: 'use feature:new',
        status: 'proposed',
      };
    registry.register(record);
    registry.register({ ...record, status: 'approved' });
    registry.register({ ...record, status: 'effective' });
    registry.register({ ...record, status: 'removed' });
    expect(registry.get(record.id).status).toBe('removed');
    expect(() => {
      new DeprecationRegistry().register({ ...record, removalVersion: '1.0.0' });
    }).toThrowError(GovernanceError);
  });
  it('keeps extensions contract-compliant and preserves architectural ownership', () => {
    const valid: ExtensionProposal = {
      id: 'provider:one',
      kind: 'provider',
      contractReferences: ['contract:knowledge'],
      claimedResponsibilities: ['knowledge adapter'],
      publicTechnologyReferences: [],
      status: 'proposed',
    };
    expect(validateExtension(valid).compliant).toBe(true);
    expect(
      validateExtension({ ...valid, claimedResponsibilities: ['runtime execution'] }).findings,
    ).toContainEqual(expect.objectContaining({ code: 'EXTENSION_OWNERSHIP', passed: false }));
    expect(
      validateExtension({ ...valid, publicTechnologyReferences: ['vendor-sdk'] }).compliant,
    ).toBe(false);
  });
  it('standardizes compliance and produces governance facts and audit references', () => {
    const events = new InMemoryGovernanceEvents(),
      audit = new InMemoryGovernanceAudit(),
      diagnostics = new InMemoryGovernanceDiagnostics(),
      validator = new GovernanceValidator({
        events,
        audit,
        diagnostics,
        now: (): Date => new Date(at),
      }),
      result = validator.validateRelease(
        change({
          kinds: ['ownership'],
          targetVersion: '2.0.0',
          compatibility: [compatibility(false)],
          migrationReference: 'migration:1',
        }),
      );
    expect(result.compliant).toBe(true);
    expect(events.values.map((item) => item.type)).toEqual(['version.released']);
    expect(audit.values.map((item) => item.action)).toEqual(['breaking-change', 'major-release']);
    expect(diagnostics.values).toHaveLength(1);
  });
  it('reports non-compliant changes explicitly', () => {
    const validator = new GovernanceValidator({
        events: new InMemoryGovernanceEvents(),
        audit: new InMemoryGovernanceAudit(),
        diagnostics: new InMemoryGovernanceDiagnostics(),
        now: (): Date => new Date(at),
      }),
      result = validator.validateRelease(
        change({
          kinds: ['contract'],
          targetVersion: '1.1.0',
          compatibility: [compatibility(false)],
        }),
      );
    expect(result).toMatchObject({
      compliant: false,
      findings: [{ code: 'VERSIONING', passed: false }],
    });
  });
  it('builds deterministic release-readiness reports', () => {
    const compliance = { compliant: true, findings: [], verifiedAt: at },
      report = new GovernanceReportingEngine(() => new Date(at)).build(
        'report:1',
        'change:1',
        '2.0.0',
        compliance,
        [compatibility(false)],
        ['approval:architecture'],
      );
    expect(report).toMatchObject({
      releaseReady: true,
      version: '2.0.0',
      approvals: ['approval:architecture'],
    });
    expect(Object.isFrozen(report)).toBe(true);
  });
  it('does not assume Runtime Security Workflow business or deployment ownership', () => {
    const registry = new BlueprintRegistry();
    registry.register(blueprint());
    expect(registry.latest('31').ownership).toEqual(['governance']);
    expect(registry).not.toHaveProperty('runtime');
    expect(registry).not.toHaveProperty('authorization');
    expect(registry).not.toHaveProperty('deploymentProvider');
  });
});
