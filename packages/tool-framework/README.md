# @agentprodready/tool-framework

Blueprint 09's provider-independent external-system interaction boundary. Runtime retains all operational execution policy.

## v0.2 (Amendment A / product v0.9)

- Optional `ToolContract.approvalRequirement?: 'none' | 'required'` (default `none`)
- `ToolExecutionRequest.signal?: AbortSignal`
- Additive error codes: `TOOL_APPROVAL_REQUIRED`, `TOOL_RESULT_TOO_LARGE`, `TOOL_UNSAFE_RECOVERY`, `TOOL_CANCELLED`
- Lifecycle facts: `tool.requested` / `authorized` / `denied` / `started` / `approval-required` / `completed` / `failed` / `cancelled`
- Deterministic reference tools: `reference.echo` (read-only) and `reference.counter` (mutating + idempotent)

Does **not** import OpenAI or `@agentprodready/ai-provider-openai`. See [Tool Calling guide](../../docs/guides/tools.md).
