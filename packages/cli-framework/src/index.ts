import type { StreamFrame } from '@agentprodready/api-framework';
import {
  SdkError,
  type CreateJobResult,
  type HealthResult,
  type OperationResult,
  type SdkCancellationSignal,
} from '@agentprodready/sdk-framework';

export type OutputFormat = 'text' | 'json' | 'compact' | 'table';
export type CliErrorCode =
  | 'INVALID_COMMAND'
  | 'INVALID_ARGUMENTS'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_DENIED'
  | 'CONFIGURATION_INVALID'
  | 'CONNECTION_FAILED'
  | 'API_ERROR'
  | 'COMMAND_FAILED'
  | 'CANCELLED';
export class CliError extends Error {
  public constructor(
    public readonly code: CliErrorCode,
    message: string,
    public readonly exitCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CliError';
  }
}
export interface CliConfiguration {
  readonly profile: string;
  readonly defaultFormat: OutputFormat;
  readonly interactive: boolean;
  readonly cliVersion: string;
  readonly sdkVersion: string;
}
export interface CliConfigurationSource {
  load(): Promise<CliConfiguration>;
}
export interface CliPrompt {
  input(message: string): Promise<string>;
}
export type CliCancellation = SdkCancellationSignal;
export interface CliSdkClient {
  health(): Promise<HealthResult>;
  createJob(input: Readonly<{ jobDefinitionReference: string }>): Promise<CreateJobResult>;
  getOperation(id: string): Promise<OperationResult>;
  streamOperation(id: string, cancellation: SdkCancellationSignal): AsyncIterable<StreamFrame>;
}
export interface CliInvocation {
  readonly commandId: string;
  readonly arguments: readonly string[];
  readonly options: Readonly<Record<string, string | boolean>>;
  readonly format: OutputFormat;
  readonly interactive: boolean;
  readonly profile: string;
}
export interface CliCommandDefinition {
  readonly id: string;
  readonly path: readonly string[];
  readonly description: string;
  readonly minimumArguments: number;
  readonly maximumArguments: number;
  readonly outputFormat: OutputFormat;
}
export interface CliCommandHandler {
  execute(invocation: CliInvocation, cancellation: CliCancellation): Promise<unknown>;
}
export interface CliCommandRegistration {
  readonly definition: CliCommandDefinition;
  readonly handler: CliCommandHandler;
}
export interface CliFormatter {
  readonly format: OutputFormat;
  render(value: unknown): string;
}
export interface CliPlugin {
  readonly id: string;
  readonly commands: readonly CliCommandRegistration[];
  readonly formatters: readonly CliFormatter[];
}
export interface CliDiagnostic {
  readonly type: 'cli.command-started' | 'cli.command-completed' | 'cli.command-failed';
  readonly commandId: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly cliVersion: string;
  readonly sdkVersion: string;
  readonly occurredAt: string;
}
export interface CliDiagnostics {
  record(value: CliDiagnostic): void;
}
export interface CliResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly commandId: string | null;
}

export class CliRegistry {
  private readonly commands = new Map<string, CliCommandRegistration>();
  private readonly formatters = new Map<OutputFormat, CliFormatter>();
  public registerCommand(value: CliCommandRegistration): void {
    const key = value.definition.path.join(' ');
    if (this.commands.has(key))
      throw new CliError('CONFIGURATION_INVALID', `Duplicate CLI command: ${key}`, 3);
    this.commands.set(key, freezeRegistration(value));
  }
  public registerFormatter(value: CliFormatter): void {
    if (this.formatters.has(value.format))
      throw new CliError('CONFIGURATION_INVALID', `Duplicate output formatter: ${value.format}`, 3);
    this.formatters.set(value.format, value);
  }
  public load(plugin: CliPlugin): void {
    for (const command of plugin.commands) this.registerCommand(command);
    for (const formatter of plugin.formatters) this.registerFormatter(formatter);
  }
  public resolve(
    tokens: readonly string[],
  ): Readonly<{ registration: CliCommandRegistration; consumed: number }> | null {
    const candidates = [...this.commands.values()]
      .filter((item) => item.definition.path.every((part, index) => tokens[index] === part))
      .sort((a, b) => b.definition.path.length - a.definition.path.length);
    const registration = candidates[0];
    return registration === undefined
      ? null
      : { registration, consumed: registration.definition.path.length };
  }
  public formatter(format: OutputFormat): CliFormatter {
    const value = this.formatters.get(format);
    if (value === undefined)
      throw new CliError('CONFIGURATION_INVALID', `Formatter is not registered: ${format}`, 3);
    return value;
  }
}
export interface CliFrameworkDependencies {
  readonly configuration: CliConfigurationSource;
  readonly registry: CliRegistry;
  readonly prompt: CliPrompt;
  readonly diagnostics: CliDiagnostics;
  readonly cancellation: CliCancellation;
  readonly now: () => Date;
}
export class CliFramework {
  public constructor(private readonly dependencies: CliFrameworkDependencies) {}
  public async run(argv: readonly string[]): Promise<CliResult> {
    let commandId: string | null = null,
      startedAt = 0,
      configuration: CliConfiguration | undefined;
    try {
      configuration = await this.dependencies.configuration.load();
      validateCliConfiguration(configuration);
      const parsed = parseArguments(argv),
        resolved = this.dependencies.registry.resolve(parsed.positionals);
      if (resolved === null) throw new CliError('INVALID_COMMAND', 'Unknown command.', 2);
      commandId = resolved.registration.definition.id;
      const args = parsed.positionals.slice(resolved.consumed),
        interactive = parsed.options['non-interactive'] !== true && configuration.interactive;
      while (args.length < resolved.registration.definition.minimumArguments && interactive)
        args.push(await this.dependencies.prompt.input(`Enter ${commandId} argument:`));
      if (
        args.length < resolved.registration.definition.minimumArguments ||
        args.length > resolved.registration.definition.maximumArguments ||
        args.some((value) => value.trim() === '')
      )
        throw new CliError('INVALID_ARGUMENTS', `Invalid arguments for ${commandId}.`, 2);
      const requested = parsed.options['format'],
        format =
          typeof requested === 'string'
            ? parseFormat(requested)
            : resolved.registration.definition.outputFormat,
        invocation = freeze({
          commandId,
          arguments: Object.freeze([...args]),
          options: freeze({ ...parsed.options }),
          format,
          interactive,
          profile:
            typeof parsed.options['profile'] === 'string'
              ? parsed.options['profile']
              : configuration.profile,
        });
      startedAt = this.dependencies.now().getTime();
      this.record('cli.command-started', commandId, 0, 0, configuration);
      const value = await resolved.registration.handler.execute(
          invocation,
          this.dependencies.cancellation,
        ),
        stdout = this.dependencies.registry.formatter(format).render(value);
      this.record('cli.command-completed', commandId, this.elapsed(startedAt), 0, configuration);
      return freeze({ exitCode: 0, stdout, stderr: '', commandId });
    } catch (error: unknown) {
      const normalized = normalizeCliError(error);
      if (commandId !== null && configuration !== undefined)
        this.record(
          'cli.command-failed',
          commandId,
          this.elapsed(startedAt),
          normalized.exitCode,
          configuration,
        );
      return freeze({
        exitCode: normalized.exitCode,
        stdout: '',
        stderr: normalized.message,
        commandId,
      });
    }
  }
  private record(
    type: CliDiagnostic['type'],
    commandId: string,
    durationMs: number,
    exitCode: number,
    configuration: CliConfiguration,
  ): void {
    this.dependencies.diagnostics.record(
      freeze({
        type,
        commandId,
        durationMs,
        exitCode,
        cliVersion: configuration.cliVersion,
        sdkVersion: configuration.sdkVersion,
        occurredAt: this.dependencies.now().toISOString(),
      }),
    );
  }
  private elapsed(startedAt: number): number {
    return startedAt === 0 ? 0 : Math.max(0, this.dependencies.now().getTime() - startedAt);
  }
}
export function createReferenceCommands(sdk: CliSdkClient): readonly CliCommandRegistration[] {
  return Object.freeze([
    command('health', ['health'], 0, 0, 'text', async (): Promise<unknown> => sdk.health()),
    command('jobs.create', ['jobs', 'create'], 1, 1, 'text', async (invocation): Promise<unknown> =>
      sdk.createJob({ jobDefinitionReference: invocation.arguments[0] ?? '' }),
    ),
    command(
      'operations.get',
      ['operations', 'get'],
      1,
      1,
      'text',
      async (invocation): Promise<unknown> => sdk.getOperation(invocation.arguments[0] ?? ''),
    ),
    command(
      'operations.stream',
      ['operations', 'stream'],
      1,
      1,
      'compact',
      async (invocation, cancellation): Promise<unknown> => {
        const values: StreamFrame[] = [];
        for await (const frame of sdk.streamOperation(invocation.arguments[0] ?? '', cancellation))
          values.push(frame);
        return Object.freeze(values);
      },
    ),
  ]);
}
function command(
  id: string,
  path: readonly string[],
  minimumArguments: number,
  maximumArguments: number,
  outputFormat: OutputFormat,
  execute: CliCommandHandler['execute'],
): CliCommandRegistration {
  return {
    definition: freeze({
      id,
      path: Object.freeze([...path]),
      description: id,
      minimumArguments,
      maximumArguments,
      outputFormat,
    }),
    handler: { execute },
  };
}
export function parseArguments(
  argv: readonly string[],
): Readonly<{ positionals: string[]; options: Record<string, string | boolean> }> {
  const positionals: string[] = [],
    options: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) break;
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const [name, inline] = token.slice(2).split('=', 2);
    if (
      name === undefined ||
      !['format', 'non-interactive', 'profile', 'help'].includes(name) ||
      options[name] !== undefined
    )
      throw new CliError('INVALID_ARGUMENTS', `Invalid option: ${token}`, 2);
    if (name === 'non-interactive' || name === 'help') {
      options[name] = true;
      continue;
    }
    const value = inline ?? argv[index + 1];
    if (value === undefined || value.startsWith('--'))
      throw new CliError('INVALID_ARGUMENTS', `Missing value for --${name}.`, 2);
    options[name] = value;
    if (inline === undefined) index += 1;
  }
  return { positionals, options };
}
export function validateCliConfiguration(value: CliConfiguration): void {
  if (
    value.profile.trim() === '' ||
    !['text', 'json', 'compact', 'table'].includes(value.defaultFormat) ||
    !/^\d+\.\d+\.\d+$/.test(value.cliVersion) ||
    !/^\d+\.\d+\.\d+$/.test(value.sdkVersion)
  )
    throw new CliError('CONFIGURATION_INVALID', 'CLI configuration is invalid.', 3);
}
export function parseFormat(value: string): OutputFormat {
  if (value === 'text' || value === 'json' || value === 'compact' || value === 'table')
    return value;
  throw new CliError('INVALID_ARGUMENTS', `Unsupported output format: ${value}`, 2);
}
export function normalizeCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  if (error instanceof SdkError) {
    const mapping: Readonly<Record<string, Readonly<[CliErrorCode, number]>>> = {
      AUTHENTICATION_FAILED: ['AUTHENTICATION_FAILED', 4],
      CONNECTION_FAILED: ['CONNECTION_FAILED', 6],
      TIMEOUT: ['CONNECTION_FAILED', 6],
      API_ERROR: ['API_ERROR', 7],
      UNSUPPORTED_VERSION: ['API_ERROR', 7],
      CANCELLED: ['CANCELLED', 130],
    };
    const mapped = mapping[error.code] ?? ['COMMAND_FAILED', 8];
    return new CliError(mapped[0], error.message, mapped[1], { cause: error });
  }
  return new CliError('COMMAND_FAILED', 'Command execution failed.', 8, { cause: error });
}
function freezeRegistration(value: CliCommandRegistration): CliCommandRegistration {
  return {
    definition: freeze({ ...value.definition, path: Object.freeze([...value.definition.path]) }),
    handler: value.handler,
  };
}
function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}
export * from './reference.js';
