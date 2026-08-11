# Security (v1.0)

## Authentication

**LocalReference auth is development/demo only.** It is not production authentication.

When `NODE_ENV=production`, the host **fails startup** if LocalReference would be the sole HTTP auth, unless `AGENTPRODREADY_ALLOW_REFERENCE_AUTH=true` (unsafe escape hatch; logs a warning). Production deployments must plug in a real auth adapter (OAuth/OIDC/etc. are user/plugin-supplied — core does not ship an identity server).

Example LocalReference header (local only):

```http
Authorization: LocalReference principalId=local-user;tenantId=local-tenant
```

## Authorization & tools

Security authorizes before tool execution. Capability Resolution / Composition select and instantiate adapters; Runtime owns the loop and checkpoints.

Hard rules retained from v0.9:

- No eval / `Function` / arbitrary shell / model-selected paths / unrestricted FS / raw SQL tools in core
- `approvalRequirement: 'required'` → parks execution; Simple path: `approve` + `resume` (v1.6); host may still surface `TOOL_APPROVAL_REQUIRED`
- Non-idempotent unknown recovery → `TOOL_UNSAFE_RECOVERY`
- Non-idempotent external effects are **not** exactly-once; idempotent tools with durable ledger are exactly-once-**capable**

See [tools.md](./tools.md).

## Tenant isolation

Package-level isolation must hold across Persistence, Runtime checkpoints, Memory, vector rows, Evaluation results, and tenant-scoped Audit. The reference host may be single-tenant; do not weaken repository scoping.

## HTTP hardening

- Bound JSON bodies with `MAX_JSON_BODY_BYTES` (default 1 MiB)
- Do not widen CORS to `*` by default
- Return stable public error codes/messages — never raw internal `Error.message` or secrets

## Secrets

Supported mechanism: environment injection. Vault/cloud secret managers are out of scope for v1.0.

Secrets **must not** appear in logs, metrics labels, trace attribute values, audit payloads, `/health` or `/ready`, client errors, or checkpoints beyond connection-free config references.

Treat `OPENAI_API_KEY`, `DATABASE_URL`, and DB passwords as sensitive. `OPENAI_BASE_URL` has SSRF risk — avoid link-local/metadata hosts in production.

## AI routing

Failover uses normalized retryable errors only. No silent provider switch after client-visible stream content/tool-call, or after tool-loop turn envelope. Embedding routing stays fixed. See [multi-provider-routing.md](./multi-provider-routing.md).

## Reporting vulnerabilities

See repository root [SECURITY.md](../../SECURITY.md).
