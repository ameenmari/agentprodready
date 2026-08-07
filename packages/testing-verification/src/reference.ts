import type {
  TestAudit,
  TestAuditReference,
  TestDiagnostic,
  TestDiagnostics,
  TestEvent,
  TestEvents,
  TestReportRenderer,
  VerificationReport,
} from './index.js';
export class JsonTestReportRenderer implements TestReportRenderer {
  public readonly format = 'json';
  public render(report: VerificationReport): string {
    return JSON.stringify(report, null, 2);
  }
}
export class HtmlTestReportRenderer implements TestReportRenderer {
  public readonly format = 'html';
  public render(report: VerificationReport): string {
    const escape = (value: string): string =>
      value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `<!doctype html><html><body><h1>${escape(report.id)}</h1><p>Status: ${report.status}</p><p>Total: ${String(report.total)} Passed: ${String(report.passed)} Failed: ${String(report.failed)}</p></body></html>`;
  }
}
export class InMemoryTestEvents implements TestEvents {
  public readonly values: TestEvent[] = [];
  public publish(event: TestEvent): void {
    this.values.push(event);
  }
}
export class InMemoryTestAudit implements TestAudit {
  public readonly values: TestAuditReference[] = [];
  public record(reference: TestAuditReference): void {
    this.values.push(reference);
  }
}
export class InMemoryTestDiagnostics implements TestDiagnostics {
  public readonly values: TestDiagnostic[] = [];
  public record(value: TestDiagnostic): void {
    this.values.push(value);
  }
}
