# `@agentprodready/agent-framework`

**Agent definition, validation, registry, lifecycle, packaging, and Runtime invocation handoff for AgentProdReady.**

| | |
|---|---|
| **Status** | Production contracts published (`1.0.x`) |
| **Install** | `npm install @agentprodready/agent-framework` |
| **Module** | ESM (`"type": "module"`) |
| **License** | MIT |
| **Repository** | [ameenmari/agentprodready](https://github.com/ameenmari/agentprodready) |

> **Positioning:** Simple to start · production-ready when you need it.  
> v1.0 ships **platform contracts**. A one-line `createAgent()` facade is planned for **v1.1** — see [DX facade note](https://github.com/ameenmari/agentprodready/blob/main/docs/product/agentprodready-v1.1-developer-experience-facade.md).

---

## Installation

```bash
# Library usage (recommended entry for TypeScript apps)
npm install @agentprodready/agent-framework

# Common companions
npm install @agentprodready/runtime
npm install @agentprodready/ai-provider
npm install @agentprodready/ai-provider-openai
npm install @agentprodready/security
npm install @agentprodready/memory
npm install @agentprodready/tool-framework
```

**Requirements**

- Node.js **20+** (monorepo CI uses Node **24**)
- TypeScript recommended (`moduleResolution: "NodeNext"` or `"Bundler"`)
- ESM project (`"type": "module"` or `.mts`)

This package depends on several `@agentprodready/*` siblings (Runtime, Security, Composition, …). That is expected for a platform module.

---

## Features

| Feature | Description |
|---|---|
| **Declarative manifests** | Describe agents as data: purpose, capabilities, tools, memory, constraints, governance |
| **Immutable definitions** | `buildAgentDefinition` freezes a validated definition identity |
| **Validation** | Structural, dependency, constraint, security, and governance findings |
| **Registry** | Versioned registration per tenant / workspace / project scope |
| **Lifecycle** | Explicit states: draft → validated → registered → approved → active → … |
| **Discovery** | Query agents by id, type, capability, lifecycle state |
| **Version resolution** | Explicit / pinned / rollout / latest-compatible-active policies |
| **Invocation handoff** | `invoke` / `invokeStream` → Runtime ports (Agent Framework does **not** call LLMs itself) |
| **Reference adapters** | In-memory registry, lifecycle store, validator, audit/diagnostics helpers for demos & tests |
| **Typed errors** | `AgentError` + stable error codes |

---

## Mental model

```text
Manifest
   ↓  buildAgentDefinition()
Definition
   ↓  validate(catalog)
ValidationResult
   ↓  register + lifecycle → active
AgentFramework
   ↓  invoke / invokeStream
Runtime.accept / acceptStream
   ↓
Your Runtime + AI / tools / memory composition
```

| Layer | Responsibility |
|---|---|
| **This package** | Who the agent is, whether it may be used, handoff to Runtime |
| **Runtime** | Execute, cancel, checkpoint, stream |
| **AI Provider** | Talk to models |
| **Security** | Authorization decisions |
| **Composition** | Wire concrete adapters |

---

## Quick start

### 1) Install & import

```ts
import {
  buildAgentDefinition,
  AgentFramework,
  DeterministicAgentValidator,
  InMemoryAgentRegistry,
  InMemoryAgentLifecycleStore,
  InMemoryAgentFacts,
  InMemoryAgentAudit,
  InMemoryAgentDiagnostics,
  type AgentManifest,
  type AgentRuntimePort,
  type AgentAuthorizationOutcome,
  type ValidationCatalog,
} from '@agentprodready/agent-framework';
```

### 2) Define a manifest

```ts
const manifest = {
  manifestId: 'm-support',
  schemaVersion: '1',
  agentId: 'support-agent',
  version: '1.0.0',
  name: 'Support Assistant',
  description: 'Answers support questions',
  purpose: 'Handle customer support objectives',
  type: 'conversational',
  principalReference: 'principal:support-agent',
  scope: { tenantId: 'acme' },
  capabilities: [
    { capability: 'chat', contractVersion: '1', requirement: 'required' },
  ],
  tools: [],
  knowledge: [],
  memory: [],
  planning: { enabled: false, strategies: [], policyReference: 'policy:default' },
  workflows: [],
  contextPolicyReferences: [],
  promptPolicyReferences: [],
  evaluationPolicyReferences: [],
  securityPermissionDeclarations: ['agent:invoke'],
  delegationRequirementReferences: [],
  constraints: {
    maximumDurationMs: 60_000,
    maximumCost: 5,
    maximumToolInvocations: 10,
    maximumPlanningDepth: 2,
    maximumWorkflowIterations: 5,
    prohibitedOperations: [],
    requiredApprovals: [],
    dataResidencies: ['local'],
  },
  configuration: { tone: 'helpful' },
  policyReferences: ['policy:default'],
  pluginDependencies: [],
  compatibility: { platformRange: '1.0.0', contractVersions: { chat: '1' } },
  governance: {
    owner: 'platform-team',
    reviewStatus: 'approved',
    classification: 'internal',
    policyVersion: '1',
  },
  publisherReference: 'acme',
  sourceConfigurationVersions: [],
  createdAt: new Date().toISOString(),
  createdBy: 'platform-team',
  parentAgentReferences: [],
  appliedOverrides: [],
} satisfies AgentManifest;

const definition = buildAgentDefinition(manifest, ['policy:default']);
```

### 3) Validate against a catalog

```ts
const catalog = {
  capabilities: new Map([['chat', ['1']]]),
  plugins: new Map<string, string>(),
  workflows: new Set<string>(),
  policies: new Set(['policy:default']),
  packages: new Set<string>(),
  platformVersion: '1.0.0',
} satisfies ValidationCatalog;
```

### 4) Create the framework (reference stores + Runtime stub)

```ts
const runtime: AgentRuntimePort = {
  async accept(request) {
    // Wire your RuntimeOrchestrator here in production
    return { executionReference: `exec:${request.invocationId}` };
  },
  async acceptStream(request) {
    return { executionReference: `exec:${request.invocationId}:stream` };
  },
};

const framework = new AgentFramework(
  new InMemoryAgentRegistry(),
  new InMemoryAgentLifecycleStore(),
  new DeterministicAgentValidator(),
  runtime,
  new InMemoryAgentFacts(),
  new InMemoryAgentAudit(),
  new InMemoryAgentDiagnostics(),
);

const validation = framework.validate(definition, catalog);
if (validation.status === 'invalid') {
  throw new Error(validation.findings.map((f) => f.message).join('; '));
}
```

### 5) Authorize, register, activate, invoke

```ts
function auth(
  operation: AgentAuthorizationOutcome['operation'],
): AgentAuthorizationOutcome {
  return {
    decisionId: `decision:${operation}`,
    authorized: true,
    state: 'active',
    operation,
    principalId: 'user-1',
    agentPrincipalId: 'principal:support-agent',
    scope: definition.scope,
    allowedCapabilities: ['chat'],
    allowedTools: [],
    allowedKnowledgeScopes: [],
    allowedMemoryScopes: [],
    restrictions: [],
    obligations: [],
    policyVersion: '1',
  };
}

const at = () => new Date().toISOString();

await framework.register(definition, validation, auth('register'), 'user-1', at());

await framework.transition(
  definition.agentId,
  definition.version,
  definition.scope,
  'approved',
  auth('lifecycle'),
  'ready for production',
  at(),
);

await framework.transition(
  definition.agentId,
  definition.version,
  definition.scope,
  'active',
  auth('lifecycle'),
  'activated',
  at(),
  {
    approvalReference: 'approval:1',
    evaluationReference: 'evaluation:1',
    compatibilityReference: 'compat:1',
  },
);

const acceptance = await framework.invoke({
  id: 'inv-1',
  agentId: definition.agentId,
  objective: 'How do I reset my password?',
  initiatingPrincipalId: 'user-1',
  agentPrincipalId: 'principal:support-agent',
  scope: definition.scope,
  inputs: {},
  constraints: {},
  delegationReferences: [],
  securityContextReference: 'sec:1',
  authorization: auth('invoke'),
  correlationId: 'corr-1',
  causationId: null,
  requestedAt: at(),
  versionPolicyVersion: '1',
});

console.log('handed off to Runtime:', acceptance.runtimeExecutionReference);
```

### Streaming invoke

```ts
const streamAcceptance = await framework.invokeStream({
  /* same shape as invoke request */
  id: 'inv-stream-1',
  agentId: definition.agentId,
  objective: 'Stream a short answer',
  initiatingPrincipalId: 'user-1',
  agentPrincipalId: 'principal:support-agent',
  scope: definition.scope,
  inputs: {},
  constraints: {},
  delegationReferences: [],
  securityContextReference: 'sec:1',
  authorization: auth('invoke'),
  correlationId: 'corr-stream-1',
  causationId: null,
  requestedAt: at(),
  versionPolicyVersion: '1',
});
```

| Agent Framework API | Runtime port |
|---|---|
| `invoke` | `AgentRuntimePort.accept` |
| `invokeStream` | `AgentRuntimePort.acceptStream` |

**Do not** call `invoke` and then Runtime `executeStream` for the same invocation identity.  
Guide: [Streaming](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/streaming.md).

---

## Want a running HTTP agent today?

The monorepo **reference host** wires Agent Framework + Runtime + AI + tools + memory:

```bash
git clone https://github.com/ameenmari/agentprodready.git
cd agentprodready
pnpm install
pnpm start

curl -X POST http://127.0.0.1:3000/v1/agents/reference-agent/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: LocalReference principalId=local-user;tenantId=local-tenant" \
  -d "{\"objective\":\"hello\"}"
```

See the [repository README](https://github.com/ameenmari/agentprodready#readme) and [configuration guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/configuration.md).

---

## API reference (primary)

### `buildAgentDefinition(manifest, validationPolicyVersions, builderVersion?)`

Builds an immutable `AgentDefinition` (adds `definitionId`, `immutable: true`).

Throws `AgentError` when the manifest is structurally invalid or contains forbidden secret-like content.

### `class AgentFramework`

| Method | Purpose |
|---|---|
| `validate(definition, catalog)` | Run validator; returns findings |
| `register(definition, validation, authorization, principalId, at)` | Register version (idempotent if unchanged) |
| `transition(agentId, version, scope, to, authorization, reason, at, options?)` | Lifecycle change |
| `discover(request)` | Query registered agents |
| `resolveVersion(request)` | Pick an active compatible version |
| `effective(definition, authorization, invocation)` | Narrow capabilities/tools by auth |
| `invoke(request)` | Handoff to Runtime `accept` |
| `invokeStream(request)` | Handoff to Runtime `acceptStream` |
| `migration(request)` | Propose migration / rollback |

### Reference helpers

| Export | Role |
|---|---|
| `DeterministicAgentValidator` | Catalog-based validator |
| `InMemoryAgentRegistry` | Process-local registry |
| `InMemoryAgentLifecycleStore` | Process-local lifecycle history |
| `InMemoryAgentPackages` | Package store |
| `InMemoryAgentFacts` / `InMemoryAgentAudit` / `InMemoryAgentDiagnostics` / `InMemoryAgentTelemetry` | Test/demo sinks |

### Errors

```ts
import { AgentError } from '@agentprodready/agent-framework';

try {
  // ...
} catch (error) {
  if (error instanceof AgentError) {
    console.error(error.code, error.diagnosticId, error.message);
  }
}
```

Common codes: `AGENT_MANIFEST_INVALID`, `AGENT_VALIDATION_FAILED`, `AGENT_NOT_ACTIVE`, `AGENT_AUTHORIZATION_DENIED`, `AGENT_RUNTIME_HANDOFF_FAILED`, …

---

## Lifecycle states

```text
draft → validated → registered → approved → active
                                              ↓
                         deactivated | suspended | quarantined | deprecated → retired
```

Transitioning to `active` requires `approvalReference`, `evaluationReference`, and `compatibilityReference` on the transition options (enforced by `AgentFramework`).

---

## Security notes

- Every mutating / invoke path requires an `AgentAuthorizationOutcome` with matching `operation` and scope.
- This package does **not** authenticate HTTP requests. Wire `@agentprodready/security` (or your own adapter) in Composition.
- LocalReference auth in the reference host is **dev-only** — see [SECURITY.md](https://github.com/ameenmari/agentprodready/blob/main/SECURITY.md).

---

## Related packages

| Package | Role |
|---|---|
| [`@agentprodready/runtime`](https://www.npmjs.com/package/@agentprodready/runtime) | Execution, checkpoints, streaming |
| [`@agentprodready/ai-provider`](https://www.npmjs.com/package/@agentprodready/ai-provider) | Vendor-neutral AI contracts |
| [`@agentprodready/ai-provider-openai`](https://www.npmjs.com/package/@agentprodready/ai-provider-openai) | OpenAI adapter |
| [`@agentprodready/security`](https://www.npmjs.com/package/@agentprodready/security) | Authorization |
| [`@agentprodready/tool-framework`](https://www.npmjs.com/package/@agentprodready/tool-framework) | Tools |
| [`@agentprodready/memory`](https://www.npmjs.com/package/@agentprodready/memory) | Memory |
| [`@agentprodready/composition`](https://www.npmjs.com/package/@agentprodready/composition) | Instantiation / DI |

Full list: [npm org `@agentprodready`](https://www.npmjs.com/org/agentprodready) · [distribution guide](https://github.com/ameenmari/agentprodready/blob/main/docs/guides/npm-distribution.md)

---

## Documentation

| Doc | Link |
|---|---|
| Platform README | https://github.com/ameenmari/agentprodready#readme |
| Blueprint 18 | https://github.com/ameenmari/agentprodready/blob/main/docs/blueprints/18-agent-framework.md |
| Streaming guide | https://github.com/ameenmari/agentprodready/blob/main/docs/guides/streaming.md |
| Tools guide | https://github.com/ameenmari/agentprodready/blob/main/docs/guides/tools.md |
| AI providers | https://github.com/ameenmari/agentprodready/blob/main/docs/guides/ai-providers.md |
| Changelog | https://github.com/ameenmari/agentprodready/blob/main/CHANGELOG.md |
| Issues | https://github.com/ameenmari/agentprodready/issues |

---

## Roadmap

- **v1.1** — `createAgent({ name, model, instructions })` high-level facade with safe defaults  
- Keep all low-level APIs above for production governance  

---

## License

MIT © 2026 ameenmari
