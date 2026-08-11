# Security Policy

## Supported versions

AgentProdReady’s supported stable release line is **1.x** once `1.0.0` is the current stable product release.

| Version | Supported |
|---|---|
| 1.x (stable) | Yes — security fixes on the current stable minor as practical |
| 0.x pre-stable product slices | No — upgrade to 1.x |
| Unreleased / development branches | Best-effort only |

Pre-1.0 local reference slices were architecture and product milestones, not a long-term supported security baseline.

## Simple Agent API (`createAgent`) vs production auth

The v1.1 **Simple Agent API** (`createAgent` on `@agentprodready/agent-framework`) uses **application-local / embedded** security defaults suitable for local apps, CLIs, prototypes, and embedded features.

**Simple/embedded mode is not production HTTP authentication.** If you expose an agent through your own public API, you authenticate users and supply appropriate Security context via the advanced platform path.

## LocalReference authentication

**LocalReference HTTP authentication is not production authentication.** It exists for local development and demos only.

When `NODE_ENV=production`, the reference host refuses to start with LocalReference as sole auth unless `AGENTPRODREADY_ALLOW_REFERENCE_AUTH=true` (explicit unsafe demo escape hatch). Production deployments must supply a real authentication adapter. See `docs/guides/security.md`.

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public GitHub issue for exploitable vulnerabilities.

1. Use GitHub **Security Advisories** / private vulnerability reporting on this repository if available, **or**
2. Contact the maintainers through the repository’s listed security contact / owner channels.

Include:

- Affected version or commit
- Impact (auth bypass, tenant isolation, secret exposure, RCE, etc.)
- Reproduction steps or proof-of-concept (non-destructive preferred)
- Any known workarounds

You should receive an acknowledgment when maintainers are available. Please allow reasonable time for assessment and a fix or mitigation before public disclosure.

## Scope notes

- Secrets must not appear in logs, metrics, audit payloads, health endpoints, or client errors
- Core does not ship unrestricted shell/filesystem/SQL tools or an OAuth/OIDC server
- Exactly-once external tool effects for **non-idempotent** tools are not claimed. Idempotent tools with a durable ledger are exactly-once-**capable**. Durable HITL wait/resume is available on the Simple path in v1.6 (`approve` / `reject` / `resume`).
