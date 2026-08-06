import type {
  ConfigurationAudit,
  ConfigurationDefinition,
  ConfigurationDiagnostics,
  ConfigurationEvents,
  ConfigurationFact,
  ConfigurationStore,
  ConfigurationValidator,
  ConfigurationValue,
  PolicyDefinition,
  PolicyStore,
  PolicyValidator,
  ValidationFinding,
  ValidationResult,
  ValueConstraint,
} from './index.js';
import { freeze } from './index.js';

export class InMemoryConfigurationStore implements ConfigurationStore {
  readonly #values = new Map<string, ConfigurationDefinition>();
  public save(value: ConfigurationDefinition): void {
    const key = this.key(value.id, value.version);
    if (!this.#values.has(key)) this.#values.set(key, freeze(copy(value)));
  }
  public get(id: string, version: string): ConfigurationDefinition | undefined {
    const value = this.#values.get(this.key(id, version));
    return value === undefined ? undefined : freeze(copy(value));
  }
  public versions(id: string): readonly ConfigurationDefinition[] {
    return freeze([...this.#values.values()].filter((value) => value.id === id).map(copy));
  }
  public all(namespace: string): readonly ConfigurationDefinition[] {
    return freeze(
      [...this.#values.values()].filter((value) => value.namespace === namespace).map(copy),
    );
  }
  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }
}
export class InMemoryPolicyStore implements PolicyStore {
  readonly #values = new Map<string, PolicyDefinition>();
  public save(value: PolicyDefinition): void {
    const key = this.key(value.id, value.version);
    if (!this.#values.has(key)) this.#values.set(key, freeze(copy(value)));
  }
  public get(id: string, version: string): PolicyDefinition | undefined {
    const value = this.#values.get(this.key(id, version));
    return value === undefined ? undefined : freeze(copy(value));
  }
  public versions(id: string): readonly PolicyDefinition[] {
    return freeze([...this.#values.values()].filter((value) => value.id === id).map(copy));
  }
  public all(): readonly PolicyDefinition[] {
    return freeze([...this.#values.values()].map(copy));
  }
  private key(id: string, version: string): string {
    return `${id}@${version}`;
  }
}
export class DeterministicConfigurationValidator implements ConfigurationValidator {
  public constructor(private readonly validatorVersion = '1') {}
  public validate(value: ConfigurationDefinition): ValidationResult {
    const findings: ValidationFinding[] = [];
    for (const constraint of value.constraints) {
      const item = value.values[constraint.key];
      if (constraint.required && item === undefined)
        findings.push(finding('REQUIRED', constraint.key, 'Required value is missing'));
      if (item !== undefined && !validType(item, constraint.type))
        findings.push(finding('TYPE', constraint.key, 'Value type is invalid'));
      if (
        typeof item === 'number' &&
        ((constraint.minimum !== undefined && item < constraint.minimum) ||
          (constraint.maximum !== undefined && item > constraint.maximum))
      )
        findings.push(finding('RANGE', constraint.key, 'Value is outside allowed range'));
      if (
        typeof item === 'string' &&
        constraint.pattern !== undefined &&
        !new RegExp(constraint.pattern).test(item)
      )
        findings.push(finding('PATTERN', constraint.key, 'Value does not match pattern'));
      if (
        constraint.allowedValues !== undefined &&
        !constraint.allowedValues.some(
          (allowed) => JSON.stringify(allowed) === JSON.stringify(item),
        )
      )
        findings.push(finding('ENUM', constraint.key, 'Value is not allowed'));
      if (
        constraint.referenceRequired &&
        !(
          typeof item === 'object' &&
          item !== null &&
          'kind' in item &&
          item.kind === 'secret-reference'
        )
      )
        findings.push(finding('REFERENCE', constraint.key, 'Opaque reference is required'));
    }
    for (const key of Object.keys(value.values))
      if (!value.constraints.some((item) => item.key === key))
        findings.push(finding('UNKNOWN', key, 'Value has no constraint'));
    return freeze({
      id: `validation:configuration:${value.id}:${value.version}`,
      kind: 'configuration',
      definitionId: value.id,
      version: value.version,
      valid: findings.length === 0,
      findings,
      validatorVersion: this.validatorVersion,
      diagnosticsReference: `configuration:validation:${value.id}`,
    });
  }
}
export class DeterministicPolicyValidator implements PolicyValidator {
  public constructor(private readonly validatorVersion = '1') {}
  public validate(value: PolicyDefinition): ValidationResult {
    const findings: ValidationFinding[] = [];
    const ids = new Set<string>();
    for (const clause of value.clauses) {
      if (ids.has(clause.id))
        findings.push(finding('DUPLICATE_CLAUSE', clause.id, 'Clause ID is duplicated'));
      ids.add(clause.id);
      if (!Number.isInteger(clause.priority) || clause.priority < 0)
        findings.push(finding('PRIORITY', clause.id, 'Priority is invalid'));
      if (value.type === 'security' && clause.effect === 'allow')
        findings.push(
          finding(
            'SECURITY_AUTHORITY',
            clause.id,
            'Configuration policy cannot create Security authorization',
          ),
        );
    }
    return freeze({
      id: `validation:policy:${value.id}:${value.version}`,
      kind: 'policy',
      definitionId: value.id,
      version: value.version,
      valid: findings.length === 0,
      findings,
      validatorVersion: this.validatorVersion,
      diagnosticsReference: `configuration:validation:${value.id}`,
    });
  }
}
export class InMemoryConfigurationEvents implements ConfigurationEvents {
  public readonly values: ConfigurationFact[] = [];
  public async publish(value: ConfigurationFact): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryConfigurationAudit implements ConfigurationAudit {
  public readonly values: unknown[] = [];
  public async record(value: Parameters<ConfigurationAudit['record']>[0]): Promise<void> {
    this.values.push(freeze(copy(value)));
  }
}
export class InMemoryConfigurationDiagnostics implements ConfigurationDiagnostics {
  readonly #values: unknown[] = [];
  public record(value: Parameters<ConfigurationDiagnostics['record']>[0]): void {
    this.#values.push(freeze(copy(value)));
  }
  public list(): readonly unknown[] {
    return freeze(copy(this.#values));
  }
}

function finding(code: string, path: string, message: string): ValidationFinding {
  return freeze({ code, path, message, blocking: true });
}
function validType(value: ConfigurationValue, type: ValueConstraint['type']): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object')
    return (
      typeof value === 'object' && value !== null && !Array.isArray(value) && !('kind' in value)
    );
  if (type === 'secret-reference')
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      'kind' in value &&
      value.kind === 'secret-reference'
    );
  return typeof value === type;
}
function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
