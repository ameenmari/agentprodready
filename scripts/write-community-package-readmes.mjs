/**
 * One-shot / refresh writer for platform package READMEs (Community Gravity).
 * Source of truth after run: the README.md files themselves.
 * Re-run only when intentionally regenerating stub-tier packages.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function page(pkg) {
  const {
    dir,
    name,
    promise,
    when,
    notWhen,
    install,
    sample,
    owns,
    notOwns,
    docs = [],
    related = [],
  } = pkg;

  const docLines = docs.map((d) => `- ${d}`).join('\n');
  const relatedLines =
    related.length === 0
      ? ''
      : `\n## Related\n\n${related.map((r) => `- ${r}`).join('\n')}\n`;

  return `# \`${name}\`

**${promise}**

| | |
|---|---|
| **Status** | Production contracts published |
| **Install** | \`npm install ${name}\` |
| **Module** | ESM · Node.js \`>=22 <25\` |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

---

## When to use

${when}

**Prefer not to start here** if ${notWhen}

---

## Install

\`\`\`bash
${install}
\`\`\`

---

## Sample

\`\`\`ts
${sample}
\`\`\`

---

## Ownership

| Owns | Does **not** own |
|---|---|
| ${owns} | ${notOwns} |

---

## Documentation

${docLines}
- [Repository README](https://github.com/ameenmari/agentprodready#readme)
- [Package README standard](https://github.com/ameenmari/agentprodready/blob/main/docs/community/package-readme-standard.md)

${relatedLines}
## License

MIT © 2026 ameenmari
`;
}

const catalog = [
  {
    dir: 'foundation',
    name: '@agentprodready/foundation',
    promise: 'Immutable foundation contracts and Application Host baseline for AgentProdReady.',
    when: 'You are building a host or platform package that needs shared identity, scope, and execution context types.',
    notWhen: 'you only need an embedded agent — use `@agentprodready/agent-framework` `createAgent` instead.',
    install: 'npm install @agentprodready/foundation',
    sample: `import type { ExecutionContext } from '@agentprodready/foundation';

// Shared across Runtime, Security, and capabilities — do not invent parallel context shapes.
declare const context: ExecutionContext;
console.log(context.executionId, context.tenantId);`,
    owns: 'Foundational immutable contracts; Application Host baseline',
    notOwns: 'Runtime execution; authorization decisions; AI vendor calls',
    docs: [
      '[Blueprint 01 — Foundation](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/01-foundation.md)',
    ],
    related: [
      '[`@agentprodready/agent-framework`](https://www.npmjs.com/package/@agentprodready/agent-framework) — start here for apps',
      '[`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime)',
    ],
  },
  {
    dir: 'composition',
    name: '@agentprodready/composition',
    promise: 'Composition root ownership — instantiate and wire platform dependencies without scattering `new` across the app.',
    when: 'You are assembling a production host (or studying how the reference host is wired).',
    notWhen: 'you are embedding a weekend agent — `createAgent` owns embedded composition for you.',
    install: 'npm install @agentprodready/composition',
    sample: `import { CompositionRoot } from '@agentprodready/composition';

const root = new CompositionRoot();
root.build();
// Host registers providers/adapters on the root — Composition owns instantiation lifetime.
await root.dispose();`,
    owns: 'Instantiation ownership; composition graph lifetime',
    notOwns: 'Authorization; Runtime orchestration; capability selection policy',
    docs: [
      '[Blueprint 02 — Composition](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/02-composition.md)',
    ],
  },
  {
    dir: 'capability-resolution',
    name: '@agentprodready/capability-resolution',
    promise: 'Select which implementation fulfills a capability binding — provider-neutral resolution.',
    when: 'Your host routes work to AI / tool / other capability implementations by policy.',
    notWhen: 'Simple `createAgent` already resolves embedded bindings for you.',
    install: 'npm install @agentprodready/capability-resolution',
    sample: `import type { CapabilityResolver } from '@agentprodready/capability-resolution';

declare const resolver: CapabilityResolver;
// Runtime asks for a binding; this package selects the implementation id.
const binding = await resolver.resolve(/* CapabilityResolutionRequest */);
console.log(binding.implementationId);`,
    owns: 'Capability → implementation selection',
    notOwns: 'Executing the capability; authorizing the caller; constructing adapters',
    docs: [
      '[Blueprint 07](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/07-capability-resolution.md)',
    ],
  },
  {
    dir: 'workflow',
    name: '@agentprodready/workflow',
    promise: 'Workflow / node execution contracts used by Runtime capability invocations.',
    when: 'You need typed workflow node contracts in a host or capability port.',
    notWhen: 'you only need `createAgent().invoke()` — start with agent-framework.',
    install: 'npm install @agentprodready/workflow',
    sample: `import type { NodeExecutionContract } from '@agentprodready/workflow';

const node: NodeExecutionContract = Object.freeze({
  workflowId: 'workflow:demo',
  nodeId: 'node:1',
  kind: 'capability',
  capability: 'demo-capability',
});`,
    owns: 'Workflow node contracts',
    notOwns: 'Runtime scheduling; Security authorization; AI provider I/O',
    docs: [
      '[Blueprint 06](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/06-workflow-engine.md)',
    ],
  },
  {
    dir: 'planning',
    name: '@agentprodready/planning',
    promise: 'Planning engine contracts — turn objectives into executable plans for Runtime.',
    when: 'You customize how hosts derive plans/workflows from agent objectives.',
    notWhen: 'Simple Agent API already embeds a reference planning path.',
    install: 'npm install @agentprodready/planning',
    sample: `import type { PlanningEngine } from '@agentprodready/planning';

declare const planning: PlanningEngine;
// Hosts supply a planning adapter; Runtime consumes the resulting plan.
const plan = await planning.plan(/* PlanningRequest */);
console.log(plan);`,
    owns: 'Plan production contracts',
    notOwns: 'Executing plans (Runtime); tool authorization (Security)',
    docs: [
      '[Blueprint 05](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/05-planning-engine.md)',
    ],
  },
  {
    dir: 'prompt-builder',
    name: '@agentprodready/prompt-builder',
    promise: 'Prompt package construction contracts — assemble model-facing prompts without owning AI I/O.',
    when: 'You customize prompt packaging for a host or advanced agent path.',
    notWhen: '`createAgent({ instructions })` is enough for your app.',
    install: 'npm install @agentprodready/prompt-builder',
    sample: `import type { PromptBuilder } from '@agentprodready/prompt-builder';

declare const prompts: PromptBuilder;
const pkg = await prompts.build(/* PromptBuildRequest */);
console.log(pkg.id);`,
    owns: 'Prompt package construction',
    notOwns: 'Calling the model (AI Provider); Runtime execution',
    docs: [
      '[Blueprint 13](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/13-prompt-builder.md)',
    ],
  },
  {
    dir: 'context-assembly',
    name: '@agentprodready/context-assembly',
    promise: 'Assemble execution context packages (memory, knowledge, constraints) for a turn.',
    when: 'Your host customizes what context is injected before model/tool work.',
    notWhen: 'Simple `memory: true` on `createAgent` covers your weekend path.',
    install: 'npm install @agentprodready/context-assembly',
    sample: `import type { ContextAssemblyEngine } from '@agentprodready/context-assembly';

declare const assembly: ContextAssemblyEngine;
const pack = await assembly.assemble(/* ContextAssemblyRequest */);
console.log(pack);`,
    owns: 'Context assembly contracts',
    notOwns: 'Durable memory storage; vector indexes; authorization',
    docs: [
      '[Blueprint 12](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/12-context-assembly-engine.md)',
    ],
  },
  {
    dir: 'knowledge',
    name: '@agentprodready/knowledge',
    promise: 'Knowledge / RAG-oriented contracts — distinct from execution-derived Memory.',
    when: 'You integrate curated knowledge retrieval into a host.',
    notWhen: 'you only need turn memory — see `@agentprodready/memory` or Simple `memory: true`.',
    install: 'npm install @agentprodready/knowledge',
    sample: `import type { KnowledgeEngine } from '@agentprodready/knowledge';

declare const knowledge: KnowledgeEngine;
const hits = await knowledge.retrieve(/* KnowledgeRetrieveRequest */);
console.log(hits);`,
    owns: 'Knowledge retrieval contracts',
    notOwns: 'Memory engine; vector store vendor drivers; Runtime',
    docs: [
      '[Blueprint 11](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/11-knowledge-and-rag.md)',
    ],
  },
  {
    dir: 'event-bus',
    name: '@agentprodready/event-bus',
    promise: 'Platform event bus contracts for operational events between components.',
    when: 'You publish/subscribe normalized platform events in a host.',
    notWhen: 'you only need Simple `invoke` results — start with agent-framework.',
    install: 'npm install @agentprodready/event-bus',
    sample: `import type { EventBus } from '@agentprodready/event-bus';

declare const bus: EventBus;
await bus.publish(/* PlatformEvent */);`,
    owns: 'Event transport contracts',
    notOwns: 'Durable audit storage; telemetry backends; authorization',
    docs: [
      '[Blueprint 16](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/16-event-bus.md)',
    ],
  },
  {
    dir: 'audit',
    name: '@agentprodready/audit',
    promise: 'Audit & compliance fact ingestion contracts — immutable audit records for hosts.',
    when: 'Your host records governed audit facts from Security / Runtime / tools.',
    notWhen: 'you are prototyping with Simple Agent API only.',
    install: 'npm install @agentprodready/audit',
    sample: `import type { AuditIngestor } from '@agentprodready/audit';

declare const audit: AuditIngestor;
await audit.ingest(/* AuditIngestRequest */);`,
    owns: 'Audit ingestion / record contracts',
    notOwns: 'Authorization decisions; event bus transport; Persistence drivers',
    docs: [
      '[Blueprint 17](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/17-audit-and-compliance.md)',
    ],
  },
  {
    dir: 'observability',
    name: '@agentprodready/observability',
    promise: 'Logs, metrics, traces, diagnostics, and health contracts for platform hosts.',
    when: 'You wire production telemetry into a composed host.',
    notWhen: 'you only need Simple `result.metadata` debugging — see the Simple Diagnostics guide.',
    install: 'npm install @agentprodready/observability',
    sample: `import type { PlatformLogger } from '@agentprodready/observability';

declare const log: PlatformLogger;
log.info('host.ready', { service: 'my-agent-host' });`,
    owns: 'Observability contracts (logs/metrics/traces/health)',
    notOwns: 'Simple Agent facade metadata; vendor APM SDKs as ownership',
    docs: [
      '[Blueprint 22](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/22-observability-and-diagnostics.md)',
      '[Simple Diagnostics](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/simple-diagnostics.md)',
    ],
  },
  {
    dir: 'configuration',
    name: '@agentprodready/configuration',
    promise: 'Configuration contracts — typed config loading for replaceable host settings.',
    when: 'Your host needs versioned configuration providers.',
    notWhen: 'env vars + `createAgent` options are enough.',
    install: 'npm install @agentprodready/configuration',
    sample: `import type { ConfigurationProvider } from '@agentprodready/configuration';

declare const config: ConfigurationProvider;
const value = await config.get('runtime.timeoutMs');
console.log(value);`,
    owns: 'Configuration provider contracts',
    notOwns: 'Secret storage; Runtime policy evaluation; npm config',
    docs: [
      '[Blueprint 23](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/23-configuration.md)',
    ],
  },
  {
    dir: 'persistence',
    name: '@agentprodready/persistence',
    promise: 'Persistence ports — repositories and transactions without locking you to a database vendor.',
    when: 'You need durable stores (checkpoints, memory records, etc.) behind replaceable providers.',
    notWhen: 'ephemeral Simple Memory is enough (`memory: true`).',
    install: `npm install @agentprodready/persistence
# Postgres provider (optional)
npm install @agentprodready/persistence-postgres`,
    sample: `import type { PersistenceUnitOfWork } from '@agentprodready/persistence';

declare const uow: PersistenceUnitOfWork;
await uow.withTransaction(async (tx) => {
  // repositories accessed via tx — drivers live in provider packages
  return tx;
});`,
    owns: 'Persistence ports and repository contracts',
    notOwns: 'Postgres driver details (see persistence-postgres); Runtime recovery policy',
    docs: [
      '[Blueprint 24](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/24-persistence.md)',
      '[Persistence guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/persistence.md)',
    ],
  },
  {
    dir: 'scheduler',
    name: '@agentprodready/scheduler',
    promise: 'Scheduler & background job contracts for deferred and recurring host work.',
    when: 'Your platform schedules work outside a single HTTP request.',
    notWhen: 'request/response `invoke` covers your use case.',
    install: 'npm install @agentprodready/scheduler',
    sample: `import type { Scheduler } from '@agentprodready/scheduler';

declare const scheduler: Scheduler;
await scheduler.enqueue(/* JobEnqueueRequest */);`,
    owns: 'Job/scheduler contracts',
    notOwns: 'Runtime execution of the job body; queue vendor lock-in as ownership',
    docs: [
      '[Blueprint 25](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/25-scheduler-and-background-jobs.md)',
    ],
  },
  {
    dir: 'api-framework',
    name: '@agentprodready/api-framework',
    promise: 'HTTP API framework contracts for exposing AgentProdReady hosts over the network.',
    when: 'You build an operator/public HTTP surface on top of the platform.',
    notWhen: 'you embed `createAgent` inside your existing Node service (no platform HTTP required).',
    install: 'npm install @agentprodready/api-framework',
    sample: `import type { ApiRouter } from '@agentprodready/api-framework';

declare const router: ApiRouter;
// Register routes that delegate to Agent Framework / Runtime — your auth stays yours.
router;`,
    owns: 'API routing/diagnostics contracts',
    notOwns: 'Application authentication; Runtime; browser SDKs',
    docs: [
      '[Blueprint 26](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/26-api-framework.md)',
      '[Embed deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/embed-agent-deployment.md)',
    ],
  },
  {
    dir: 'sdk-framework',
    name: '@agentprodready/sdk-framework',
    promise: 'Client SDK framework contracts for typed consumers of an AgentProdReady API.',
    when: 'You publish a typed client for your host API.',
    notWhen: 'in-process `createAgent` is your integration style.',
    install: 'npm install @agentprodready/sdk-framework',
    sample: `import type { SdkClient } from '@agentprodready/sdk-framework';

declare const client: SdkClient;
// SDK calls your HTTP API — not a substitute for @agentprodready/agent-framework in-process.`,
    owns: 'SDK client contracts / client diagnostics',
    notOwns: 'Server Runtime; Security policy engines',
    docs: [
      '[Blueprint 27](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/27-sdk-framework.md)',
    ],
  },
  {
    dir: 'cli-framework',
    name: '@agentprodready/cli-framework',
    promise: 'CLI framework contracts for operator and developer command-line surfaces.',
    when: 'You build a CLI that talks to your AgentProdReady host/API.',
    notWhen: 'you only need `npm create agentprodready` / library embed.',
    install: 'npm install @agentprodready/cli-framework',
    sample: `import type { CliApp } from '@agentprodready/cli-framework';

declare const cli: CliApp;
await cli.run(process.argv.slice(2));`,
    owns: 'CLI parsing/output/diagnostics contracts',
    notOwns: 'Business agent logic; Runtime orchestration',
    docs: [
      '[Blueprint 28](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/28-cli-framework.md)',
    ],
  },
  {
    dir: 'deployment-framework',
    name: '@agentprodready/deployment-framework',
    promise: 'Deployment descriptors and contracts for packaging AgentProdReady hosts.',
    when: 'You describe container/process deployment profiles for a host.',
    notWhen: 'you are still validating `createAgent` locally.',
    install: 'npm install @agentprodready/deployment-framework',
    sample: `import type { DeploymentDescriptor } from '@agentprodready/deployment-framework';

declare const deployment: DeploymentDescriptor;
console.log(deployment.profile);`,
    owns: 'Deployment description contracts',
    notOwns: 'Kubernetes controllers; cloud IAM; Runtime',
    docs: [
      '[Blueprint 29](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/29-deployment-framework.md)',
      '[Production deployment](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/production-deployment.md)',
    ],
  },
  {
    dir: 'testing-verification',
    name: '@agentprodready/testing-verification',
    promise: 'Testing & verification helpers for AgentProdReady platform packages and hosts.',
    when: 'You write architecture/integration tests against platform contracts.',
    notWhen: 'Vitest unit tests against your own `createAgent` app are enough.',
    install: 'npm install @agentprodready/testing-verification',
    sample: `// Pair with Vitest in the monorepo or a composed host test suite.
import '@agentprodready/testing-verification';

console.log('testing-verification contracts available');`,
    owns: 'Verification helpers / contract test utilities',
    notOwns: 'Your application test framework choice; CI vendor',
    docs: [
      '[Blueprint 30](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/30-testing-and-verification.md)',
    ],
  },
  {
    dir: 'platform-governance',
    name: '@agentprodready/platform-governance',
    promise: 'Platform governance & evolution contracts — versioning, compatibility, governance facts.',
    when: 'You operate multi-version platform evolution policies.',
    notWhen: 'you are shipping a single-app embedded agent.',
    install: 'npm install @agentprodready/platform-governance',
    sample: `import type { CompatibilityPolicy } from '@agentprodready/platform-governance';

declare const policy: CompatibilityPolicy;
console.log(policy);`,
    owns: 'Governance / compatibility contracts',
    notOwns: 'npm publishing scripts; Runtime execution',
    docs: [
      '[Blueprint 31](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/31-platform-governance-and-evolution.md)',
    ],
  },
  {
    dir: 'plugin-framework',
    name: '@agentprodready/plugin-framework',
    promise: 'Plugin load/activation contracts — extend a host without forking core packages.',
    when: 'You define or host plugins against AgentProdReady plugin contracts.',
    notWhen: 'Simple `tool()` covers your extension needs.',
    install: 'npm install @agentprodready/plugin-framework',
    sample: `import type { PluginManager } from '@agentprodready/plugin-framework';

declare const plugins: PluginManager;
await plugins.register(/* PluginRegistration */);`,
    owns: 'Plugin registration/activation contracts',
    notOwns: 'Marketplace distribution; Capability Resolution selection',
    docs: [
      '[Blueprint 20](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/20-plugin-framework.md)',
    ],
  },
  {
    dir: 'plugin-marketplace',
    name: '@agentprodready/plugin-marketplace',
    promise: 'Plugin marketplace / distribution contracts — discovery and integrity facts (not code execution).',
    when: 'You describe or host a plugin registry/distribution surface.',
    notWhen: 'local `tool()` definitions are enough.',
    install: 'npm install @agentprodready/plugin-marketplace',
    sample: `import type { PluginRegistry } from '@agentprodready/plugin-marketplace';

declare const registry: PluginRegistry;
const hit = await registry.find('example-plugin');
console.log(hit);`,
    owns: 'Distribution/registry/integrity contracts',
    notOwns: 'Loading plugin code; Runtime execution; npm itself',
    docs: [
      '[Blueprint 21](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/21-plugin-marketplace-and-distribution.md)',
    ],
  },
  {
    dir: 'human-interaction',
    name: '@agentprodready/human-interaction',
    promise: 'Human-in-the-loop interaction contracts — approvals and human tasks for hosts.',
    when: 'Your host needs HITL approval flows beyond fail-closed Simple tools.',
    notWhen: 'Simple tools with `approvalRequirement: "required"` (fail closed) are enough today.',
    install: 'npm install @agentprodready/human-interaction',
    sample: `import type { HumanInteractionService } from '@agentprodready/human-interaction';

declare const hitl: HumanInteractionService;
// Durable wait/resume is demand-gated on the product roadmap — contracts exist for hosts.
console.log(hitl);`,
    owns: 'HITL interaction contracts',
    notOwns: 'Simple Agent fail-closed approvals; UI frameworks',
    docs: [
      '[Blueprint 19](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/19-human-interaction.md)',
    ],
  },
  {
    dir: 'multi-agent',
    name: '@agentprodready/multi-agent',
    promise: 'Multi-agent coordination contracts — compose multiple agents under platform ownership rules.',
    when: 'You coordinate more than one agent identity in a host.',
    notWhen: 'a single `createAgent` instance solves your problem.',
    install: 'npm install @agentprodready/multi-agent',
    sample: `import type { MultiAgentCoordinator } from '@agentprodready/multi-agent';

declare const coordinator: MultiAgentCoordinator;
console.log(coordinator);`,
    owns: 'Multi-agent coordination contracts',
    notOwns: 'Single-agent Simple API; Runtime internals',
    docs: [
      '[Blueprint 18](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/18-multi-agent-orchestration.md)',
    ],
  },
  {
    dir: 'evaluation',
    name: '@agentprodready/evaluation',
    promise: 'Evaluation framework — score and compare agent runs with replaceable evaluators.',
    when: 'You add offline/online evaluation to a host or CI quality gate.',
    notWhen: 'manual `invoke` checks are enough for your prototype.',
    install: 'npm install @agentprodready/evaluation',
    sample: `import type { EvaluationRunner } from '@agentprodready/evaluation';

declare const evaluation: EvaluationRunner;
const report = await evaluation.run(/* EvaluationRunRequest */);
console.log(report);`,
    owns: 'Evaluation run / scoring contracts',
    notOwns: 'Model training; Observability backends; Simple facade',
    docs: [
      '[Evaluation guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/evaluation.md)',
      '[Blueprint 14](https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/14-evaluation-framework.md)',
    ],
  },
];

for (const entry of catalog) {
  const path = join(root, 'packages', entry.dir, 'README.md');
  writeFileSync(path, page(entry), 'utf8');
  process.stdout.write(`wrote ${entry.name}\n`);
}

process.stdout.write(`Done — ${catalog.length} platform READMEs\n`);
