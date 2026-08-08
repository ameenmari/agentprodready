export type SimpleAgentErrorCode =
  | 'AGENT_INVALID_CONFIG'
  | 'AGENT_INVALID_MODEL'
  | 'AGENT_INIT_FAILED'
  | 'AGENT_MISSING_OPENAI_KEY'
  | 'AGENT_PROVIDER_UNAVAILABLE'
  | 'AGENT_TIMEOUT'
  | 'AGENT_CLOSED'
  | 'AGENT_INVOKE_FAILED'
  | 'AGENT_STREAM_FAILED'
  | 'AGENT_MISSING_OPENAI_PACKAGE'
  | 'AGENT_TOOL_AUTHORIZATION'
  | 'AGENT_TOOL_APPROVAL_REQUIRED'
  | 'AGENT_TOOL_REJECTED';

/** Developer-facing facade error — distinct from advanced AgentError. */
export class SimpleAgentError extends Error {
  public constructor(
    public readonly code: SimpleAgentErrorCode,
    message: string,
    public readonly diagnosticId?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SimpleAgentError';
  }
}
