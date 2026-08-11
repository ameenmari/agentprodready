# `@agentprodready/multi-agent`

Multi-agent **coordination contracts** plus the Simple Team API (`createTeam`).

| | |
| --- | --- |
| **Install** | `npm install @agentprodready/multi-agent` |
| **Entrance** | Prefer `createTeam` via `@agentprodready/agent-framework` |
| **Strategies (v1.1)** | `sequential`, `parallel`, `supervisor` (+ `handoff`) |

```ts
import { createAgent, createTeam, reference } from '@agentprodready/agent-framework';

const researcher = createAgent({ name: 'researcher', model: reference(), instructions: 'Research' });
const analyst = createAgent({ name: 'analyst', model: reference(), instructions: 'Analyze' });

const team = createTeam({
  agents: { researcher, analyst },
  strategy: 'sequential',
});

const result = await team.run('Topic');
```

Team decides **what** runs; each agent’s `invoke()` still uses Runtime for **how**.
