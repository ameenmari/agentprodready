import type { HostStatus, LifecycleComponent, LifecycleStatus } from '../contracts/foundation.js';
import { FoundationError } from '../errors/foundation-error.js';
import { deepFreeze, requireText } from '../internal/validation.js';

type HostState = HostStatus['state'];

export class ApplicationHost {
  readonly #components: ReadonlyMap<string, LifecycleComponent>;
  readonly #status = new Map<string, LifecycleStatus>();
  #state: HostState = 'idle';
  #started: LifecycleComponent[] = [];

  public constructor(components: readonly LifecycleComponent[]) {
    const entries = components.map((component) => [requireText(component.id, 'component.id'), component] as const);
    this.#components = new Map(entries);
    if (this.#components.size !== entries.length) {
      throw new FoundationError('FOUNDATION_DUPLICATE_REGISTRATION', 'Lifecycle component ids must be unique');
    }
    for (const id of this.#components.keys()) this.#status.set(id, 'registered');
    this.#orderedComponents();
  }

  public status(): HostStatus {
    return deepFreeze({ state: this.#state, components: Object.fromEntries(this.#status) });
  }

  public async start(): Promise<void> {
    if (this.#state === 'started') return;
    if (this.#state !== 'idle' && this.#state !== 'stopped') {
      throw new FoundationError('FOUNDATION_STARTUP_FAILED', `Cannot start host from ${this.#state}`);
    }
    this.#state = 'starting';
    this.#started = [];
    try {
      for (const component of this.#orderedComponents()) {
        this.#status.set(component.id, 'starting');
        await component.start();
        this.#status.set(component.id, 'started');
        this.#started.push(component);
      }
      this.#state = 'started';
    } catch (cause) {
      await this.#stopStarted();
      this.#state = 'failed';
      throw new FoundationError('FOUNDATION_STARTUP_FAILED', 'Platform startup failed', { cause });
    }
  }

  public async stop(): Promise<void> {
    if (this.#state === 'stopped' || this.#state === 'idle') return;
    this.#state = 'stopping';
    await this.#stopStarted();
    this.#state = 'stopped';
  }

  async #stopStarted(): Promise<void> {
    for (const component of [...this.#started].reverse()) {
      this.#status.set(component.id, 'stopping');
      try { await component.stop(); this.#status.set(component.id, 'stopped'); }
      catch { this.#status.set(component.id, 'failed'); }
    }
    this.#started = [];
  }

  #orderedComponents(): readonly LifecycleComponent[] {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const result: LifecycleComponent[] = [];
    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new FoundationError('FOUNDATION_DEPENDENCY_CYCLE', `Cycle at ${id}`);
      const component = this.#components.get(id);
      if (component === undefined) throw new FoundationError('FOUNDATION_MISSING_DEPENDENCY', `Missing ${id}`);
      visiting.add(id);
      for (const dependency of [...component.dependencies].sort()) {
        if (!this.#components.has(dependency)) throw new FoundationError('FOUNDATION_MISSING_DEPENDENCY', `${id} requires ${dependency}`);
        visit(dependency);
      }
      visiting.delete(id); visited.add(id); result.push(component);
    };
    for (const id of [...this.#components.keys()].sort()) visit(id);
    return result;
  }
}
