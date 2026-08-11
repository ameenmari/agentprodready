export type SimpleAgentErrorCode =
  | 'AGENT_INVALID_CONFIG'
  | 'AGENT_INVALID_MODEL'
  | 'AGENT_INIT_FAILED'
  | 'AGENT_MISSING_OPENAI_KEY'
  | 'AGENT_MISSING_ANTHROPIC_KEY'
  | 'AGENT_MISSING_GEMINI_KEY'
  | 'AGENT_PROVIDER_UNAVAILABLE'
  | 'AGENT_TIMEOUT'
  | 'AGENT_CLOSED'
  | 'AGENT_INVOKE_FAILED'
  | 'AGENT_STREAM_FAILED'
  | 'AGENT_MISSING_OPENAI_PACKAGE'
  | 'AGENT_MISSING_ANTHROPIC_PACKAGE'
  | 'AGENT_MISSING_GEMINI_PACKAGE'
  | 'AGENT_TOOL_AUTHORIZATION'
  | 'AGENT_TOOL_APPROVAL_REQUIRED'
  | 'AGENT_TOOL_REJECTED'
  | 'AGENT_APPROVAL_NOT_FOUND'
  | 'AGENT_RESUME_FAILED';

/** Developer-facing facade error — distinct from advanced AgentError. */
export class SimpleAgentError extends Error {
  public readonly approvalId?: string;
  public readonly executionId?: string;

  public constructor(
    public readonly code: SimpleAgentErrorCode,
    message: string,
    public readonly diagnosticId?: string,
    options?: ErrorOptions & {
      readonly approvalId?: string;
      readonly executionId?: string;
    },
  ) {
    super(message, options);
    this.name = 'SimpleAgentError';
    if (options?.approvalId !== undefined) this.approvalId = options.approvalId;
    if (options?.executionId !== undefined) this.executionId = options.executionId;
  }
}
