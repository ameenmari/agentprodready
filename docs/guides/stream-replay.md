# Stream Replay (Simple)

Reconnect to an in-flight or completed stream by sequence number on the Simple Agent API.

Production-oriented architecture with a young ecosystem.

This is **library-level** replay (`agent.stream` / `agent.replayStream`), not HTTP SSE reconnect on `platform-host`. See [Streaming (host SSE)](./streaming.md) for the operator HTTP surface.

## Live reconnect

```js
let lastSequence = 0;

for await (const event of agent.stream("Summarize the report", { resumeFrom: lastSequence })) {
  if ("sequence" in event && typeof event.sequence === "number") {
    lastSequence = event.sequence;
  }
  if (event.type === "text") process.stdout.write(event.text);
}
```

`resumeFrom` is an **exclusive** lower bound: events with `sequence > resumeFrom` are yielded, then live tail continues if the execution is still open.

## Replay completed stream

```js
for await (const event of agent.replayStream(executionId, afterSequence)) {
  if (event.type === "text") process.stdout.write(event.text);
}
```

`replayStream` reads the durable stream event log only — no live tail.

## Durability

- Events append to a `StreamEventLog` during `stream()`.
- Default embedded log is in-memory; with `fileMemory({ directory })`, events persist under `directory/.streams/` for restart-safe replay.
- Chunks are logged for client replay; final capability results still follow Runtime checkpoint rules.

## Related

- [Simple Agent API](./simple-agent-api.md)
- [Streaming (host SSE)](./streaming.md)
