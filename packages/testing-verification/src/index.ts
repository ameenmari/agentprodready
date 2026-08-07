export type TestLevel =
  | 'unit'
  | 'integration'
  | 'contract'
  | 'component'
  | 'workflow'
  | 'agent'
  | 'end-to-end'
  | 'performance'
  | 'compatibility'
  | 'regression';
export type TestOutcome = 'passed' | 'failed' | 'skipped';
export type FindingSeverity = 'error' | 'warning' | 'information';
export interface TestDefinition {
  readonly id: string;
  readonly version: string;
  readonly level: TestLevel;
  readonly targetComponent: string;
  readonly preconditions: readonly string[];
  readonly expectedResults: readonly string[];
  readonly fixtureReferences: readonly string[];
  readonly configurationProfileReference: string;
  readonly verificationRuleIds: readonly string[];
  readonly metadata: Readonly<Record<string, string>>;
}
export interface TestSuite {
  readonly id: string;
  readonly version: string;
  readonly testIds: readonly string[];
  readonly configurationProfileReference: string;
  readonly productionTarget: boolean;
}
export interface TestAssertion {
  readonly id: string;
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
}
export interface TestExecutionValue {
  readonly assertions: readonly TestAssertion[];
  readonly diagnostics: readonly string[];
}
export interface TestExecutor {
  execute(definition: TestDefinition): Promise<TestExecutionValue>;
}
export interface TestResult {
  readonly testId: string;
  readonly level: TestLevel;
  readonly outcome: TestOutcome;
  readonly assertions: readonly TestAssertion[];
  readonly diagnostics: readonly string[];
  readonly error: VerificationErrorData | null;
  readonly durationMs: number;
  readonly startedAt: string;
  readonly completedAt: string;
}
export interface ContractFinding {
  readonly ruleId: string;
  readonly targetContract: string;
  readonly severity: FindingSeverity;
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
}
export interface ContractRule {
  readonly id: string;
  readonly targetContract: string;
  readonly severity: FindingSeverity;
  readonly expected: string;
  verify(subject: Readonly<Record<string, unknown>>): ContractFinding;
}
export interface ContractVerificationResult {
  readonly targetContract: string;
  readonly passed: boolean;
  readonly findings: readonly ContractFinding[];
  readonly verifiedAt: string;
}
export interface CompliancePolicy {
  readonly id: string;
  readonly version: string;
  readonly requiredRuleIds: readonly string[];
  readonly optionalRuleIds: readonly string[];
}
export interface ComplianceResult {
  readonly policyId: string;
  readonly compliant: boolean;
  readonly failures: readonly ContractFinding[];
  readonly warnings: readonly ContractFinding[];
  readonly completedAt: string;
}
export interface CoverageSummary {
  readonly statements: number;
  readonly branches: number;
  readonly functions: number;
  readonly lines: number;
}
export interface VerificationReport {
  readonly id: string;
  readonly suiteId: string;
  readonly status: 'passed' | 'failed';
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: readonly TestResult[];
  readonly contract: ContractVerificationResult | null;
  readonly compliance: ComplianceResult | null;
  readonly coverage: CoverageSummary | null;
  readonly failures: readonly string[];
  readonly warnings: readonly string[];
  readonly diagnostics: readonly string[];
  readonly frameworkVersion: string;
  readonly generatedAt: string;
}
export interface TestReportRenderer {
  readonly format: 'json' | 'html';
  render(report: VerificationReport): string;
}
export interface TestEvent {
  readonly type:
    | 'test.started'
    | 'test.completed'
    | 'test.failed'
    | 'verification.completed'
    | 'compliance.completed';
  readonly subjectId: string;
  readonly occurredAt: string;
}
export interface TestEvents {
  publish(event: TestEvent): void;
}
export interface TestAuditReference {
  readonly action: 'compliance-certification' | 'production-verification' | 'manual-verification';
  readonly subjectId: string;
  readonly outcome: 'passed' | 'failed';
  readonly occurredAt: string;
}
export interface TestAudit {
  record(reference: TestAuditReference): void;
}
export interface TestDiagnostic {
  readonly operation: string;
  readonly subjectId: string;
  readonly outcome: string;
  readonly occurredAt: string;
}
export interface TestDiagnostics {
  record(value: TestDiagnostic): void;
}
export type VerificationErrorCode =
  | 'TEST_FAILED'
  | 'VERIFICATION_FAILED'
  | 'CONTRACT_VIOLATION'
  | 'COMPATIBILITY_FAILURE'
  | 'FIXTURE_INVALID'
  | 'MOCK_FAILURE'
  | 'COMPLIANCE_FAILURE'
  | 'DEFINITION_INVALID';
export interface VerificationErrorData {
  readonly code: VerificationErrorCode;
  readonly message: string;
}
export class VerificationError extends Error {
  public constructor(
    public readonly code: VerificationErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'VerificationError';
  }
}
export class TestCatalog {
  private readonly values = new Map<string, Readonly<TestDefinition>>();
  public register(definition: TestDefinition): void {
    validateTestDefinition(definition);
    if (this.values.has(definition.id))
      throw new VerificationError('DEFINITION_INVALID', `Duplicate test: ${definition.id}`);
    this.values.set(definition.id, freezeDefinition(definition));
  }
  public get(id: string): Readonly<TestDefinition> {
    const value = this.values.get(id);
    if (value === undefined)
      throw new VerificationError('DEFINITION_INVALID', `Unknown test: ${id}`);
    return value;
  }
}
export class ContractVerifier {
  public constructor(private readonly now: () => Date) {}
  public verify(
    targetContract: string,
    subject: Readonly<Record<string, unknown>>,
    rules: readonly ContractRule[],
  ): ContractVerificationResult {
    const findings = Object.freeze(
      rules.map((rule) =>
        freeze({
          ...rule.verify(subject),
          ruleId: rule.id,
          targetContract: rule.targetContract,
          severity: rule.severity,
          expected: rule.expected,
        }),
      ),
    );
    return freeze({
      targetContract,
      passed: findings.every((item) => item.passed || item.severity !== 'error'),
      findings,
      verifiedAt: this.now().toISOString(),
    });
  }
}
export class ComplianceEngine {
  public constructor(private readonly now: () => Date) {}
  public evaluate(
    policy: CompliancePolicy,
    verification: ContractVerificationResult,
  ): ComplianceResult {
    const required = new Set(policy.requiredRuleIds),
      optional = new Set(policy.optionalRuleIds),
      byId = new Map(verification.findings.map((item) => [item.ruleId, item]));
    const missing = (id: string): ContractFinding =>
      freeze({
        ruleId: id,
        targetContract: verification.targetContract,
        severity: 'error',
        passed: false,
        expected: 'rule must pass',
        actual: 'rule missing',
      });
    const failures = Object.freeze(
        [...required].map((id) => byId.get(id) ?? missing(id)).filter((item) => !item.passed),
      ),
      warnings = Object.freeze(
        [...optional]
          .map((id) => byId.get(id) ?? missing(id))
          .filter((item) => !item.passed)
          .map((item) => freeze({ ...item, severity: 'warning' as const })),
      );
    return freeze({
      policyId: policy.id,
      compliant: failures.length === 0,
      failures,
      warnings,
      completedAt: this.now().toISOString(),
    });
  }
}
export class FixtureManager {
  private readonly values = new Map<string, string>();
  public register(id: string, value: unknown): void {
    if (id.trim() === '')
      throw new VerificationError('FIXTURE_INVALID', 'Fixture identifier is invalid.');
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error: unknown) {
      throw new VerificationError('FIXTURE_INVALID', 'Fixture is not JSON-compatible.', {
        cause: error,
      });
    }
    this.values.set(id, serialized);
  }
  public materialize(id: string): unknown {
    const value = this.values.get(id);
    if (value === undefined)
      throw new VerificationError('FIXTURE_INVALID', `Unknown fixture: ${id}`);
    return JSON.parse(value) as unknown;
  }
}
export interface MockProvider {
  readonly id: string;
  readonly contract: string;
  invoke(input: unknown): Promise<unknown>;
}
export class MockProviderRegistry {
  private readonly values = new Map<string, MockProvider>();
  public register(provider: MockProvider): void {
    const key = `${provider.contract}:${provider.id}`;
    if (this.values.has(key)) throw new VerificationError('MOCK_FAILURE', `Duplicate mock: ${key}`);
    this.values.set(key, provider);
  }
  public resolve(contract: string, id: string): MockProvider {
    const value = this.values.get(`${contract}:${id}`);
    if (value === undefined)
      throw new VerificationError('MOCK_FAILURE', 'Mock provider not found.');
    return value;
  }
}
export interface TestRunnerDependencies {
  readonly catalog: TestCatalog;
  readonly executor: TestExecutor;
  readonly events: TestEvents;
  readonly audit: TestAudit;
  readonly diagnostics: TestDiagnostics;
  readonly now: () => Date;
}
export class LocalTestRunner {
  public constructor(private readonly dependencies: TestRunnerDependencies) {}
  public async run(suite: TestSuite): Promise<readonly TestResult[]> {
    if (suite.testIds.length === 0)
      throw new VerificationError('DEFINITION_INVALID', 'Test suite is empty.');
    const results: TestResult[] = [];
    for (const id of suite.testIds) {
      const definition = this.dependencies.catalog.get(id),
        started = this.dependencies.now();
      this.dependencies.events.publish(this.event('test.started', id));
      try {
        const value = await this.dependencies.executor.execute(definition),
          outcome: TestOutcome = value.assertions.every((item) => item.passed)
            ? 'passed'
            : 'failed',
          result = freeze({
            testId: id,
            level: definition.level,
            outcome,
            assertions: Object.freeze([...value.assertions]),
            diagnostics: Object.freeze([...value.diagnostics]),
            error:
              outcome === 'failed'
                ? freeze({
                    code: 'TEST_FAILED' as const,
                    message: 'One or more assertions failed.',
                  })
                : null,
            durationMs: elapsed(started, this.dependencies.now()),
            startedAt: started.toISOString(),
            completedAt: this.dependencies.now().toISOString(),
          });
        results.push(result);
        this.dependencies.events.publish(
          this.event(outcome === 'passed' ? 'test.completed' : 'test.failed', id),
        );
        this.diagnostic(id, outcome);
      } catch (error: unknown) {
        const normalized =
            error instanceof VerificationError
              ? error
              : new VerificationError('TEST_FAILED', 'Test executor failed.', { cause: error }),
          result = freeze({
            testId: id,
            level: definition.level,
            outcome: 'failed' as const,
            assertions: Object.freeze([]),
            diagnostics: Object.freeze([]),
            error: freeze({ code: normalized.code, message: normalized.message }),
            durationMs: elapsed(started, this.dependencies.now()),
            startedAt: started.toISOString(),
            completedAt: this.dependencies.now().toISOString(),
          });
        results.push(result);
        this.dependencies.events.publish(this.event('test.failed', id));
        this.diagnostic(id, 'failed');
      }
    }
    if (suite.productionTarget)
      this.dependencies.audit.record(
        freeze({
          action: 'production-verification',
          subjectId: suite.id,
          outcome: results.every((item) => item.outcome === 'passed') ? 'passed' : 'failed',
          occurredAt: this.dependencies.now().toISOString(),
        }),
      );
    return Object.freeze(results);
  }
  private event(type: TestEvent['type'], subjectId: string): TestEvent {
    return freeze({ type, subjectId, occurredAt: this.dependencies.now().toISOString() });
  }
  private diagnostic(subjectId: string, outcome: string): void {
    this.dependencies.diagnostics.record(
      freeze({
        operation: 'test-execution',
        subjectId,
        outcome,
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
  }
}
export class ReportingEngine {
  public constructor(
    private readonly now: () => Date,
    private readonly frameworkVersion: string,
  ) {}
  public build(
    id: string,
    suiteId: string,
    results: readonly TestResult[],
    contract: ContractVerificationResult | null = null,
    compliance: ComplianceResult | null = null,
    coverage: CoverageSummary | null = null,
  ): VerificationReport {
    const passed = results.filter((item) => item.outcome === 'passed').length,
      failed = results.filter((item) => item.outcome === 'failed').length,
      skipped = results.length - passed - failed,
      failures = Object.freeze(
        results
          .filter((item) => item.error !== null)
          .map((item) => `${item.testId}: ${item.error?.message ?? 'failed'}`),
      ),
      warnings = Object.freeze(
        compliance?.warnings.map((item) => `${item.ruleId}: ${item.actual}`) ?? [],
      );
    return freeze({
      id,
      suiteId,
      status:
        failed === 0 && (contract?.passed ?? true) && (compliance?.compliant ?? true)
          ? 'passed'
          : 'failed',
      total: results.length,
      passed,
      failed,
      skipped,
      results: Object.freeze([...results]),
      contract,
      compliance,
      coverage,
      failures,
      warnings,
      diagnostics: Object.freeze(results.flatMap((item) => item.diagnostics)),
      frameworkVersion: this.frameworkVersion,
      generatedAt: this.now().toISOString(),
    });
  }
}
export function validateTestDefinition(value: TestDefinition): void {
  if (
    value.id.trim() === '' ||
    !/^\d+\.\d+\.\d+$/.test(value.version) ||
    value.targetComponent.trim() === '' ||
    value.expectedResults.length === 0 ||
    value.configurationProfileReference.trim() === ''
  )
    throw new VerificationError('DEFINITION_INVALID', 'Test definition is invalid.');
}
function freezeDefinition(value: TestDefinition): Readonly<TestDefinition> {
  return freeze({
    ...value,
    preconditions: Object.freeze([...value.preconditions]),
    expectedResults: Object.freeze([...value.expectedResults]),
    fixtureReferences: Object.freeze([...value.fixtureReferences]),
    verificationRuleIds: Object.freeze([...value.verificationRuleIds]),
    metadata: freeze({ ...value.metadata }),
  });
}
function elapsed(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime());
}
function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}
export * from './reference.js';
