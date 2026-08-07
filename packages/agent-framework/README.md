# @agentforge/agent-framework

Declarative Agent definition, validation, registry, lifecycle, versioning, packaging, and Runtime invocation-handoff contracts for Blueprint 18.

### Streaming handoff (v0.8)

- Non-stream: `invoke` → `AgentRuntimePort.accept`
- Stream: `invokeStream` → `AgentRuntimePort.acceptStream`

Do not call `invoke` then `executeStream` for the same invocation. See [Streaming guide](../../docs/guides/streaming.md).
