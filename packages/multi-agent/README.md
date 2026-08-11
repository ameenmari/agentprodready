# `@agentprodready/multi-agent`

Multi-agent **coordination contracts** plus Simple orchestration APIs: `createTeam`, `createWorkflow`, `createOrchestrator`.

| | |
| --- | --- |
| **Install** | `npm install @agentprodready/multi-agent` |
| **Entrance** | Prefer re-exports from `@agentprodready/agent-framework` |
| **Package version** | `1.1.0` |

## Team

```ts
import { createAgent, createTeam, reference } from '@agentprodready/agent-framework';

const researcher = createAgent({ name: 'researcher', model: reference(), instructions: 'Research' });
const analyst = createAgent({ name: 'analyst', model: reference(), instructions: 'Analyze' });

const team = createTeam({
  agents: { researcher, analyst },
  strategy: 'sequential', // parallel | supervisor | hierarchical | consensus | debate-review | dynamic-assignment
});

const result = await team.run('Topic');
```

## Ownership

Team / workflow decide **what** runs. Each agent’s `invoke()` still uses Runtime for **how** (retries, timeouts, checkpoints).

Also exports: `handoff()`, `createWorkflow()`, `createOrchestrator()`, checkpoint store, and `runEffect()` for idempotent side effects.
