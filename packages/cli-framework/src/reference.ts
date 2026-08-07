import type {
  CliConfiguration,
  CliConfigurationSource,
  CliDiagnostic,
  CliDiagnostics,
  CliFormatter,
  CliPrompt,
} from './index.js';
export class StaticCliConfiguration implements CliConfigurationSource {
  public constructor(private readonly value: CliConfiguration) {}
  public async load(): Promise<CliConfiguration> {
    return this.value;
  }
}
export class QueueCliPrompt implements CliPrompt {
  public readonly messages: string[] = [];
  public constructor(private readonly answers: string[]) {}
  public async input(message: string): Promise<string> {
    this.messages.push(message);
    return this.answers.shift() ?? '';
  }
}
export class InMemoryCliDiagnostics implements CliDiagnostics {
  public readonly values: CliDiagnostic[] = [];
  public record(value: CliDiagnostic): void {
    this.values.push(value);
  }
}
export class JsonCliFormatter implements CliFormatter {
  public readonly format = 'json';
  public render(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
}
export class CompactCliFormatter implements CliFormatter {
  public readonly format = 'compact';
  public render(value: unknown): string {
    return JSON.stringify(value);
  }
}
export class TextCliFormatter implements CliFormatter {
  public readonly format = 'text';
  public render(value: unknown): string {
    if (typeof value !== 'object' || value === null) return String(value);
    return Object.entries(value)
      .map(
        ([key, item]) =>
          `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`,
      )
      .join('\n');
  }
}
export class TableCliFormatter implements CliFormatter {
  public readonly format = 'table';
  public render(value: unknown): string {
    if (typeof value !== 'object' || value === null) return `VALUE\n${String(value)}`;
    return [
      'FIELD | VALUE',
      '--- | ---',
      ...Object.entries(value).map(
        ([key, item]) =>
          `${key} | ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`,
      ),
    ].join('\n');
  }
}
