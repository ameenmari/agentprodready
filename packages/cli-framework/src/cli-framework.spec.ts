import { describe, expect, it } from 'vitest';
import type { StreamFrame } from '@agentprodready/api-framework';
import { SdkError } from '@agentprodready/sdk-framework';
import {
  CliError,
  CliFramework,
  CliRegistry,
  CompactCliFormatter,
  createReferenceCommands,
  InMemoryCliDiagnostics,
  JsonCliFormatter,
  QueueCliPrompt,
  StaticCliConfiguration,
  TableCliFormatter,
  TextCliFormatter,
  type CliCancellation,
  type CliCommandRegistration,
  type CliConfiguration,
  type CliFormatter,
  type CliPlugin,
  type CliSdkClient,
} from './index.js';
const at = '2026-08-06T00:00:00.000Z',
  configuration: CliConfiguration = {
    profile: 'default',
    defaultFormat: 'text',
    interactive: true,
    cliVersion: '0.1.0',
    sdkVersion: '0.1.0',
  },
  streamFrames: readonly StreamFrame[] = [
    {
      streamId: 'stream-1',
      sequence: 0,
      type: 'started',
      payloadReference: 'payload:0',
      correlationId: 'correlation-1',
      occurredAt: at,
      terminal: false,
    },
    {
      streamId: 'stream-1',
      sequence: 1,
      type: 'completed',
      payloadReference: 'payload:1',
      correlationId: 'correlation-1',
      occurredAt: at,
      terminal: true,
    },
  ];
class RecordingSdk implements CliSdkClient {
  public readonly calls: string[] = [];
  public failure: SdkError | null = null;
  public async health(): Promise<{ healthReference: string }> {
    this.calls.push('health');
    this.throwFailure();
    return { healthReference: 'health:1' };
  }
  public async createJob(
    input: Readonly<{ jobDefinitionReference: string }>,
  ): Promise<{ operationReference: string; accepted: boolean }> {
    this.calls.push(`create:${input.jobDefinitionReference}`);
    this.throwFailure();
    return { operationReference: 'operation:1', accepted: true };
  }
  public async getOperation(id: string): Promise<{ operationReference: string; status: string }> {
    this.calls.push(`get:${id}`);
    this.throwFailure();
    return { operationReference: id, status: 'pending' };
  }
  public async *streamOperation(
    id: string,
    _cancellation: CliCancellation,
  ): AsyncIterable<StreamFrame> {
    this.calls.push(`stream:${id}`);
    this.throwFailure();
    for (const frame of streamFrames) yield frame;
  }
  private throwFailure(): void {
    if (this.failure !== null) throw this.failure;
  }
}
interface Fixture {
  readonly cli: CliFramework;
  readonly sdk: RecordingSdk;
  readonly registry: CliRegistry;
  readonly prompt: QueueCliPrompt;
  readonly diagnostics: InMemoryCliDiagnostics;
}
function fixture(
  options: Readonly<{
    answers?: string[];
    configuration?: CliConfiguration;
    sdk?: RecordingSdk;
  }> = {},
): Fixture {
  const sdk = options.sdk ?? new RecordingSdk(),
    registry = new CliRegistry();
  for (const command of createReferenceCommands(sdk)) registry.registerCommand(command);
  for (const formatter of [
    new TextCliFormatter(),
    new JsonCliFormatter(),
    new CompactCliFormatter(),
    new TableCliFormatter(),
  ])
    registry.registerFormatter(formatter);
  const prompt = new QueueCliPrompt(options.answers ?? []),
    diagnostics = new InMemoryCliDiagnostics();
  return {
    cli: new CliFramework({
      configuration: new StaticCliConfiguration(options.configuration ?? configuration),
      registry,
      prompt,
      diagnostics,
      cancellation: { cancelled: false },
      now: (): Date => new Date(at),
    }),
    sdk,
    registry,
    prompt,
    diagnostics,
  };
}
describe('commands, parsing, delegation, and automation', () => {
  it('standardizes the complete reference command tree', async () => {
    const value = fixture();
    expect((await value.cli.run(['health'])).exitCode).toBe(0);
    expect((await value.cli.run(['jobs', 'create', 'job:1'])).exitCode).toBe(0);
    expect((await value.cli.run(['operations', 'get', 'operation:1'])).exitCode).toBe(0);
    expect((await value.cli.run(['operations', 'stream', 'stream-1'])).exitCode).toBe(0);
    expect(value.sdk.calls).toEqual([
      'health',
      'create:job:1',
      'get:operation:1',
      'stream:stream-1',
    ]);
  });
  it('parses options and produces script-friendly JSON', async () => {
    const result = await fixture().cli.run([
      'health',
      '--format=json',
      '--non-interactive',
      '--profile',
      'ci',
    ]);
    expect(result).toMatchObject({ exitCode: 0, stderr: '', commandId: 'health' });
    expect(JSON.parse(result.stdout)).toEqual({ healthReference: 'health:1' });
  });
  it('validates commands arguments and options before SDK delegation', async () => {
    const value = fixture();
    expect((await value.cli.run(['missing'])).exitCode).toBe(2);
    expect((await value.cli.run(['health', 'extra'])).exitCode).toBe(2);
    expect((await value.cli.run(['health', '--unknown'])).exitCode).toBe(2);
    expect(value.sdk.calls).toHaveLength(0);
  });
  it('makes interactive mode optional without changing semantics', async () => {
    const interactive = fixture({ answers: ['job:prompted'] });
    expect((await interactive.cli.run(['jobs', 'create'])).exitCode).toBe(0);
    expect(interactive.sdk.calls).toEqual(['create:job:prompted']);
    const automated = fixture();
    expect((await automated.cli.run(['jobs', 'create', '--non-interactive'])).exitCode).toBe(2);
    expect(automated.prompt.messages).toHaveLength(0);
  });
  it('delegates authentication and all API behavior to the SDK', async () => {
    const value = fixture();
    await value.cli.run(['health']);
    expect(value.sdk.calls).toEqual(['health']);
    expect(value.cli).not.toHaveProperty('credentials');
    expect(value.cli).not.toHaveProperty('authorization');
  });
});
describe('formatters, plugins, diagnostics, configuration, and errors', () => {
  it('keeps text JSON compact and table formatters replaceable', async () => {
    for (const format of ['text', 'json', 'compact', 'table'] as const) {
      const result = await fixture().cli.run(['health', `--format=${format}`]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    }
  });
  it('loads CLI plugins through the same registry boundary', async () => {
    const value = fixture(),
      command: CliCommandRegistration = {
        definition: {
          id: 'plugin.echo',
          path: ['echo'],
          description: 'echo',
          minimumArguments: 1,
          maximumArguments: 1,
          outputFormat: 'text',
        },
        handler: { execute: async (invocation) => ({ echo: invocation.arguments[0] }) },
      },
      formatter: CliFormatter = {
        format: 'text',
        render: (input: unknown): string => String(input),
      },
      plugin: CliPlugin = { id: 'plugin:echo', commands: [command], formatters: [] };
    value.registry.load(plugin);
    expect(await value.cli.run(['echo', 'hello'])).toMatchObject({
      exitCode: 0,
      stdout: 'echo: hello',
    });
    expect(() => {
      value.registry.load({ ...plugin, id: 'duplicate' });
    }).toThrowError(CliError);
    expect(formatter.format).toBe('text');
  });
  it('records deterministic local command lifecycle diagnostics', async () => {
    const value = fixture();
    await value.cli.run(['health']);
    expect(value.diagnostics.values.map((item) => item.type)).toEqual([
      'cli.command-started',
      'cli.command-completed',
    ]);
    expect(value.diagnostics.values[1]).toMatchObject({
      commandId: 'health',
      exitCode: 0,
      cliVersion: '0.1.0',
      sdkVersion: '0.1.0',
    });
  });
  it('normalizes SDK errors to stable exit codes', async () => {
    const sdk = new RecordingSdk();
    sdk.failure = new SdkError('AUTHENTICATION_FAILED', 'denied', false);
    expect(await fixture({ sdk }).cli.run(['health'])).toMatchObject({
      exitCode: 4,
      stderr: 'denied',
    });
    sdk.failure = new SdkError('CANCELLED', 'cancelled', false);
    expect((await fixture({ sdk }).cli.run(['health'])).exitCode).toBe(130);
  });
  it('rejects invalid local configuration', async () => {
    const result = await fixture({ configuration: { ...configuration, profile: '' } }).cli.run([
      'health',
    ]);
    expect(result).toMatchObject({ exitCode: 3, commandId: null });
  });
  it('does not own business execution Runtime Workflow or authorization', async () => {
    const value = fixture(),
      result = await value.cli.run(['jobs', 'create', 'job:1']);
    expect(result.stdout).toContain('operationReference');
    expect(result).not.toHaveProperty('executionContext');
    expect(value.cli).not.toHaveProperty('runtime');
    expect(value.cli).not.toHaveProperty('workflow');
  });
  it('returns immutable command results and stream output', async () => {
    const result = await fixture().cli.run(['operations', 'stream', 'stream-1']);
    expect(result.stdout).toContain('completed');
    expect(Object.isFrozen(result)).toBe(true);
  });
});
