/** Approachable Simple Agent API types (v1.1). */

export type AgentModel =
  | { readonly provider: 'reference'; readonly modelId: 'reference' }
  | { readonly provider: 'openai'; readonly modelId: string };

export interface CreateAgentOptions {
  readonly model: AgentModel;
  readonly instructions: string;
  readonly name?: string;
  readonly description?: string;
}

export interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface AgentResult {
  readonly text: string;
  readonly output?: unknown;
  readonly executionId: string;
  readonly usage?: AgentUsage;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly raw?: unknown;
}

export type AgentStreamEvent =
  | { readonly type: 'start'; readonly executionId: string }
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'usage'; readonly usage: AgentUsage }
  | { readonly type: 'complete'; readonly executionId: string };

export interface Agent {
  invoke(input: string): Promise<AgentResult>;
  stream(input: string): AsyncIterable<AgentStreamEvent>;
  close(): Promise<void>;
}
