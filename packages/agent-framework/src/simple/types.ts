/** Approachable Simple Agent API types (v1.1+). */

import type { SimpleMemory } from './memory.js';
import type { SimpleTool } from './tool.js';

export type OpenAiCompatibleAuth = 'api-key' | 'none';

export interface ProviderModelOptions {
  readonly model: string;
  readonly maxOutputTokens?: number;
}

type ModelWithOptionalOutputTokens = {
  readonly maxOutputTokens?: number;
};

export type AgentModel =
  | ({ readonly provider: 'reference'; readonly modelId: 'reference' } & ModelWithOptionalOutputTokens)
  | ({ readonly provider: 'openai'; readonly modelId: string } & ModelWithOptionalOutputTokens)
  | ({ readonly provider: 'anthropic'; readonly modelId: string } & ModelWithOptionalOutputTokens)
  | ({ readonly provider: 'gemini'; readonly modelId: string } & ModelWithOptionalOutputTokens)
  | ({
      readonly provider: 'openai-compatible';
      readonly modelId: string;
      readonly baseUrl: string;
      readonly auth: OpenAiCompatibleAuth;
      readonly apiKey?: string;
      readonly organization?: string;
      readonly project?: string;
    } & ModelWithOptionalOutputTokens);

export interface CreateAgentOptions {
  readonly model: AgentModel;
  readonly instructions: string;
  readonly name?: string;
  readonly description?: string;
  readonly tools?: readonly SimpleTool[];
  /** `true` ≡ ephemeral `inMemory()`. Use `fileMemory` / `postgresMemory` for durable recall. */
  readonly memory?: true | SimpleMemory;
}

export interface AgentUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

/**
 * Diagnostic evidence that Simple Memory retrieve/inject ran for this turn.
 * Not a durable product contract — for wiring demos and tests.
 */
export interface AgentMemoryDiagnostics {
  readonly enabled: true;
  readonly retrievedItemCount: number;
  readonly injected: boolean;
  readonly injectedPreview: string;
}

/**
 * Counts of tool activity for a successful invoke.
 * On success, `failed` is always 0 (tool failures abort with SimpleAgentError).
 */
export interface AgentToolDiagnostics {
  readonly configured: number;
  readonly invoked: number;
  readonly succeeded: number;
  readonly failed: number;
}

export interface AgentResultMetadata {
  readonly mode: 'simple';
  readonly provider: AgentModel['provider'];
  readonly modelId: string;
  /** Wall-clock duration of the invoke (ms). */
  readonly durationMs: number;
  readonly tools: AgentToolDiagnostics;
  readonly memory?: AgentMemoryDiagnostics;
}

export interface AgentResult {
  readonly text: string;
  readonly output?: unknown;
  readonly executionId: string;
  readonly usage?: AgentUsage;
  readonly metadata?: AgentResultMetadata;
  readonly raw?: unknown;
}

export type AgentToolStreamStatus = 'executing' | 'succeeded' | 'failed';

export type AgentStreamEvent =
  | { readonly type: 'start'; readonly executionId: string }
  | { readonly type: 'text'; readonly text: string }
  | {
      readonly type: 'tool_call';
      readonly toolCallId: string;
      readonly toolId: string;
      readonly status: AgentToolStreamStatus;
    }
  | {
      readonly type: 'tool_result';
      readonly toolCallId: string;
      readonly toolId: string;
      readonly status: AgentToolStreamStatus;
    }
  | { readonly type: 'usage'; readonly usage: AgentUsage }
  | { readonly type: 'complete'; readonly executionId: string };

export interface StreamOptions {
  /** Exclusive lower bound — replay persisted events with sequence greater than this value. */
  readonly resumeFrom?: number;
}

export interface Agent {
  invoke(input: string): Promise<AgentResult>;
  stream(input: string, options?: StreamOptions): AsyncIterable<AgentStreamEvent>;
  /** Replay persisted stream events only (no live tail). */
  replayStream(executionId: string, afterSequence?: number): AsyncIterable<AgentStreamEvent>;
  /** Approve a parked tool call (Amendment D / durable HITL). */
  approve(approvalId: string): Promise<void>;
  /** Reject a parked tool call. */
  reject(approvalId: string, reason?: string): Promise<void>;
  /** Resume an execution after approve(...). */
  resume(executionId: string): Promise<AgentResult>;
  close(): Promise<void>;
}
