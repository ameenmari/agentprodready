import type { EffectiveConfiguration } from '../contracts/foundation.js';
import { deepFreeze, requireText } from '../internal/validation.js';

export class ConfigurationSnapshotFactory {
  public create(version: string, values: Readonly<Record<string, unknown>>): EffectiveConfiguration {
    return deepFreeze({ version: requireText(version, 'version'), values: structuredClone(values) });
  }
}
