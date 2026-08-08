/** Approachable Simple Agent API types (v1.1+). */

import type { SimpleMemory } from './memory.js';
import type { SimpleTool } from './tool.js';

export type OpenAiCompatibleAuth = 'api-key' | 'none';

export type AgentModel =
  | { readonly provider: 'reference'; readonly modelId: 'reference' }
  | { readonly provider: 'openai'; readonly modelId: string }
  | {
      readonly provider: 'openai-compatible';
      readonly modelId: string;
      readonly baseUrl: string;
      readonly auth: OpenAiCompatibleAuth;
      readonly apiKey?: string;
      readonly organization?: string;
      readonly project?: string;
    };

export interface CreateAgentOptions {
  readonly model: AgentModel;
  readonly instructions: string;
  readonly name?: string;
  readonly description?: string;
  readonly tools?: readonly SimpleTool[];
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

export interface AgentResultMetadata {
  readonly mode: 'simple';
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

export interface Agent {
  invoke(input: string): Promise<AgentResult>;
  stream(input: string): AsyncIterable<AgentStreamEvent>;
  close(): Promise<void>;
}
