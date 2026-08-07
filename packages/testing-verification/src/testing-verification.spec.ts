import { describe, expect, it } from 'vitest';
import {
  ComplianceEngine,
  ContractVerifier,
  FixtureManager,
  HtmlTestReportRenderer,
  InMemoryTestAudit,
  InMemoryTestDiagnostics,
  InMemoryTestEvents,
  JsonTestReportRenderer,
  LocalTestRunner,
  MockProviderRegistry,
  ReportingEngine,
  TestCatalog,
  VerificationError,
  type ContractRule,
  type TestDefinition,
  type TestExecutionValue,
  type TestExecutor,
  type TestResult,
  type TestSuite,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z',
  definition = (id: string, level: TestDefinition['level'] = 'contract'): TestDefinition => ({
    id,
    version: '1.0.0',
    level,
    targetComponent: 'api-framework',
    preconditions: [],
    expectedResults: ['contract passes'],
    fixtureReferences: ['fixture:api'],
    configurationProfileReference: 'configuration:test',
    verificationRuleIds: ['rule:shape'],
    metadata: { owner: 'testing' },
  }),
  suite: TestSuite = {
    id: 'suite:reference',
    version: '1.0.0',
    testIds: ['test:a', 'test:b'],
    configurationProfileReference: 'configuration:test',
    productionTarget: true,
  };
function runner(executor: TestExecutor): Readonly<{
  runner: LocalTestRunner;
  catalog: TestCatalog;
  events: InMemoryTestEvents;
  audit: InMemoryTestAudit;
  diagnostics: InMemoryTestDiagnostics;
}> {
  const catalog = new TestCatalog();
  catalog.register(definition('test:a'));
  catalog.register(definition('test:b', 'integration'));
  const events = new InMemoryTestEvents(),
    audit = new InMemoryTestAudit(),
    diagnostics = new InMemoryTestDiagnostics();
  return {
    runner: new LocalTestRunner({
      catalog,
      executor,
      events,
      audit,
      diagnostics,
      now: (): Date => new Date(at),
    }),
    catalog,
    events,
    audit,
    diagnostics,
  };
}
const passingExecutor: TestExecutor = {
  execute: async (): Promise<TestExecutionValue> => ({
    assertions: [{ id: 'assertion:1', passed: true, expected: 'true', actual: 'true' }],
    diagnostics: ['deterministic'],
  }),
};
describe('definitions, runner, mocks, and fixtures', () => {
  it('standardizes immutable versioned test definitions and ordered suites', async () => {
    const value = runner(passingExecutor),
      results = await value.runner.run(suite);
    expect(results.map((item) => [item.testId, item.level, item.outcome])).toEqual([
      ['test:a', 'contract', 'passed'],
      ['test:b', 'integration', 'passed'],
    ]);
    expect(Object.isFrozen(results)).toBe(true);
    expect(Object.isFrozen(value.catalog.get('test:a'))).toBe(true);
  });
  it('executes deterministically in suite order', async () => {
    const first = await runner(passingExecutor).runner.run(suite),
      second = await runner(passingExecutor).runner.run(suite);
    expect(first).toEqual(second);
  });
  it('normalizes failed assertions and continues the suite', async () => {
    let calls = 0;
    const value = runner({
        execute: async (): Promise<TestExecutionValue> => {
          calls += 1;
          return {
            assertions: [{ id: 'a', passed: calls === 2, expected: 'pass', actual: 'fail' }],
            diagnostics: [],
          };
        },
      }),
      results = await value.runner.run(suite);
    expect(results.map((item) => item.outcome)).toEqual(['failed', 'passed']);
    expect(results[0]?.error?.code).toBe('TEST_FAILED');
  });
  it('normalizes executor failures without entering production Runtime', async () => {
    const results = await runner({
      execute: (): Promise<TestExecutionValue> => Promise.reject(new Error('tool failure')),
    }).runner.run({ ...suite, productionTarget: false });
    expect(results.every((item) => item.error?.code === 'TEST_FAILED')).toBe(true);
    expect(results[0]).not.toHaveProperty('executionContext');
  });
  it('keeps mock providers replaceable by contract and identifier', async () => {
    const registry = new MockProviderRegistry();
    registry.register({
      id: 'a',
      contract: 'knowledge',
      invoke: async (): Promise<unknown> => ({ provider: 'a' }),
    });
    registry.register({
      id: 'b',
      contract: 'knowledge',
      invoke: async (): Promise<unknown> => ({ provider: 'b' }),
    });
    await expect(registry.resolve('knowledge', 'a').invoke({})).resolves.toEqual({ provider: 'a' });
    await expect(registry.resolve('knowledge', 'b').invoke({})).resolves.toEqual({ provider: 'b' });
    expect(() => {
      registry.register({
        id: 'a',
        contract: 'knowledge',
        invoke: async (): Promise<unknown> => null,
      });
    }).toThrowError(VerificationError);
  });
  it('materializes isolated fixture copies', () => {
    const fixtures = new FixtureManager();
    fixtures.register('fixture:one', { nested: { count: 1 } });
    const first = fixtures.materialize('fixture:one') as { nested: { count: number } },
      second = fixtures.materialize('fixture:one') as { nested: { count: number } };
    first.nested.count = 9;
    expect(second.nested.count).toBe(1);
    expect(first).not.toBe(second);
  });
});
describe('contracts, compliance, reporting, events, audit, and diagnostics', () => {
  it('verifies contracts deterministically with explicit findings', () => {
    const rule: ContractRule = {
        id: 'rule:shape',
        targetContract: 'api.response',
        severity: 'error',
        expected: 'normalized is true',
        verify: (subject) => ({
          ruleId: 'ignored',
          targetContract: 'ignored',
          severity: 'warning',
          passed: subject['normalized'] === true,
          expected: 'ignored',
          actual: String(subject['normalized']),
        }),
      },
      verifier = new ContractVerifier(() => new Date(at)),
      first = verifier.verify('api.response', { normalized: true }, [rule]),
      second = verifier.verify('api.response', { normalized: true }, [rule]);
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      passed: true,
      findings: [{ ruleId: 'rule:shape', severity: 'error' }],
    });
  });
  it('makes compliance failures and warnings explicit', () => {
    const verifier = new ContractVerifier(() => new Date(at)),
      rules: ContractRule[] = [
        {
          id: 'required',
          targetContract: 'sdk',
          severity: 'error',
          expected: 'present',
          verify: () => ({
            ruleId: 'required',
            targetContract: 'sdk',
            severity: 'error',
            passed: false,
            expected: 'present',
            actual: 'missing',
          }),
        },
      ],
      verification = verifier.verify('sdk', {}, rules),
      result = new ComplianceEngine(() => new Date(at)).evaluate(
        {
          id: 'policy:1',
          version: '1.0.0',
          requiredRuleIds: ['required'],
          optionalRuleIds: ['optional'],
        },
        verification,
      );
    expect(result).toMatchObject({
      compliant: false,
      failures: [{ ruleId: 'required' }],
      warnings: [{ ruleId: 'optional' }],
    });
  });
  it('builds accurate normalized reports and replaceable JSON/HTML output', () => {
    const results: TestResult[] = [
        {
          testId: 'a',
          level: 'unit',
          outcome: 'passed',
          assertions: [],
          diagnostics: ['one'],
          error: null,
          durationMs: 1,
          startedAt: at,
          completedAt: at,
        },
        {
          testId: 'b',
          level: 'contract',
          outcome: 'failed',
          assertions: [],
          diagnostics: [],
          error: { code: 'TEST_FAILED', message: 'failed' },
          durationMs: 1,
          startedAt: at,
          completedAt: at,
        },
      ],
      report = new ReportingEngine(() => new Date(at), '0.1.0').build(
        'report:1',
        'suite:1',
        results,
        null,
        null,
        { statements: 90, branches: 80, functions: 90, lines: 90 },
      );
    expect(report).toMatchObject({
      status: 'failed',
      total: 2,
      passed: 1,
      failed: 1,
      coverage: { lines: 90 },
    });
    expect(JSON.parse(new JsonTestReportRenderer().render(report))).toMatchObject({
      id: 'report:1',
    });
    expect(new HtmlTestReportRenderer().render(report)).toContain('<h1>report:1</h1>');
  });
  it('publishes test facts and production-verification audit references', async () => {
    const value = runner(passingExecutor);
    await value.runner.run(suite);
    expect(value.events.values.map((item) => item.type)).toEqual([
      'test.started',
      'test.completed',
      'test.started',
      'test.completed',
    ]);
    expect(value.audit.values).toEqual([
      {
        action: 'production-verification',
        subjectId: 'suite:reference',
        outcome: 'passed',
        occurredAt: at,
      },
    ]);
    expect(value.events.values[0]).not.toHaveProperty('deliveryAttempt');
  });
  it('records operational diagnostics without production monitoring ownership', async () => {
    const value = runner(passingExecutor);
    await value.runner.run({ ...suite, productionTarget: false });
    expect(value.diagnostics.values).toHaveLength(2);
    expect(value.diagnostics.values[0]).toMatchObject({
      operation: 'test-execution',
      outcome: 'passed',
    });
    expect(value.runner).not.toHaveProperty('monitor');
  });
});
