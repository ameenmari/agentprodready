export type TeamErrorCode =
  | 'TEAM_INVALID_CONFIG'
  | 'TEAM_STRATEGY_UNSUPPORTED'
  | 'TEAM_STRATEGY_FAILED'
  | 'TEAM_AGENT_FAILED'
  | 'TEAM_AGENT_MISSING'
  | 'TEAM_HANDOFF_FAILED'
  | 'TEAM_CANCELLED'
  | 'TEAM_SUPERVISOR_INVALID';

export class TeamError extends Error {
  public readonly code: TeamErrorCode;

  public constructor(code: TeamErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'TeamError';
    this.code = code;
  }
}
