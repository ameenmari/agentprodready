import type { EventTransport, PlatformEvent } from '../index.js';

/** Reference transport that delegates to the in-process Event Bus routing primitive. */
export class InProcessEventTransport implements EventTransport {
  public constructor(private readonly publishFn: (event: PlatformEvent) => Promise<unknown>) {}

  public async publish(event: PlatformEvent): Promise<void> {
    await this.publishFn(event);
  }
}
