import type { HealthContributor, HealthResult } from '../contracts/foundation.js';
import { deepFreeze } from '../internal/validation.js';

export class HealthService {
  public constructor(private readonly contributors: readonly HealthContributor[]) {}
  public async check(): Promise<readonly HealthResult[]> {
    return deepFreeze(await Promise.all(this.contributors.map(async (item) => item.health())));
  }
}

export class ReadinessService {
  public constructor(private readonly healthService: HealthService) {}
  public async isReady(): Promise<boolean> {
    return (await this.healthService.check()).every((result) => result.status === 'healthy');
  }
}
