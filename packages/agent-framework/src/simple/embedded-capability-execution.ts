import type { CapabilityBinding, CapabilityResolver } from '@agentprodready/capability-resolution';
import type { ExecutionContext } from '@agentprodready/foundation';
import type {
  AiProviderFramework,
  NormalizedAiResult,
} from '@agentprodready/ai-provider';
import { referenceStreamChunks } from '@agentprodready/ai-provider';
import type {
  CapabilityExecutionControl,
  CapabilityInvocationPort,
  CapabilityStreamEvent,
} from '@agentprodready/runtime';
import { NormalizedToolError } from '@agentprodready/tool-framework';
import type { NodeExecutionContract } from '@agentprodready/workflow';
import type { EmbeddedToolCallSummary, EmbeddedToolLoopDeps } from './embedded-tool-loop.js';
import { EmbeddedApprovalRequiredError, runEmbeddedToolLoop } from './embedded-tool-loop.js';
import { formatMemoryForPrompt, type EmbeddedMemorySession } from './memory.js';
import type { EmbeddedPromptService } from './embedded-prompt.js';
import { SimpleAgentError } from './errors.js';
import type { AgentMemoryDiagnostics } from './types.js';

const MEMORY_PREVIEW_MAX = 280;

const EMPTY_TOOL_SUMMARY: EmbeddedToolCallSummary = Object.freeze({
  invoked: 0,
  succeeded: 0,
  failed: 0,
});

export interface EmbeddedCapabilityOutput {
  readonly bindings: readonly CapabilityBinding[];
  readonly aiResult: NormalizedAiResult;
  readonly planId: string;
  readonly workflowId: string;
  readonly promptPackageId: string;
  readonly tools: EmbeddedToolCallSummary;
  readonly memory?: AgentMemoryDiagnostics;
}

export class EmbeddedCapabilityExecution implements CapabilityInvocationPort {
  public readonly hasToolLoop: boolean;

  private readonly toolLoopDeps: EmbeddedToolLoopDeps | undefined;
  private readonly memorySession: EmbeddedMemorySession | undefined;

  public constructor(
    private readonly resolver: CapabilityResolver,
    private readonly ai: AiProviderFramework,
    private readonly prompts: EmbeddedPromptService,
    private readonly instructions: string,
    private readonly tenantId: string,
    private readonly workspaceId: string,
    toolLoopDeps?: EmbeddedToolLoopDeps,
    memorySession?: EmbeddedMemorySession,
  ) {
    this.toolLoopDeps = toolLoopDeps;
    this.memorySession = memorySession;
    this.hasToolLoop = toolLoopDeps !== undefined;
  }

  public async invoke(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): Promise<EmbeddedCapabilityOutput> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');
    const prepared = await this.#prepare(work, context, signal);
    const executed = await this.#executeAi(prepared, context, signal, control);
    await this.#rememberTurn(context, prepared.objective, executed.aiResult);
    return Object.freeze({
      bindings: Object.freeze([prepared.binding]),
      aiResult: executed.aiResult,
      planId: `plan:${context.executionId}`,
      workflowId: prepared.workflowId,
      promptPackageId: prepared.promptPackageId,
      tools: executed.tools,
      ...(prepared.memory === undefined ? {} : { memory: prepared.memory }),
    });
  }

  public async *stream(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
  ): AsyncIterable<CapabilityStreamEvent> {
    if (signal.aborted) throw new TypeError('Capability execution aborted');

    if (this.toolLoopDeps !== undefined) {
      const prepared = await this.#prepare(work, context, signal, false);
      let sequence = 0;
      const pending: CapabilityStreamEvent[] = [];
      const emit = async (event: CapabilityStreamEvent): Promise<void> => {
        pending.push(event);
      };

      const executed = await this.#executeAi(prepared, context, signal, control, emit);
      for (const event of pending) {
        yield { ...event, sequence: sequence++ };
      }

      const text = extractText(executed.aiResult) ?? '';
      for (const chunk of referenceStreamChunks(text)) {
        if (chunk === '') continue;
        yield {
          type: 'delta',
          sequence: sequence++,
          payload: Object.freeze({ kind: 'text' as const, text: chunk }),
        };
      }

      await this.#rememberTurn(context, prepared.objective, executed.aiResult);

      yield {
        type: 'final',
        sequence: sequence++,
        result: Object.freeze({
          bindings: Object.freeze([prepared.binding]),
          aiResult: executed.aiResult,
          planId: `plan:${context.executionId}`,
          workflowId: prepared.workflowId,
          promptPackageId: prepared.promptPackageId,
          tools: executed.tools,
          ...(prepared.memory === undefined ? {} : { memory: prepared.memory }),
        }),
      };
      return;
    }

    const prepared = await this.#prepare(work, context, signal, true);
    let sequence = 0;
    let text = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let finishReason: NormalizedAiResult['finishReason'] = 'unknown';
    let diagnosticId = `ai:${prepared.request.requestId}`;
    let sawTerminal = false;

    for await (const event of this.ai.stream(prepared.request)) {
      switch (event.type) {
        case 'content': {
          if (event.part.type === 'text') {
            text += event.part.text;
            yield {
              type: 'delta',
              sequence: sequence++,
              payload: Object.freeze({ kind: 'text' as const, text: event.part.text }),
            };
          }
          break;
        }
        case 'usage': {
          usage = { ...event.usage };
          yield { type: 'usage', sequence: sequence++, usage: Object.freeze({ ...event.usage }) };
          break;
        }
        case 'completed': {
          finishReason = event.finishReason;
          diagnosticId = event.diagnosticId;
          sawTerminal = true;
          break;
        }
        case 'failed': {
          sawTerminal = true;
          throw Object.assign(new Error(event.message), { code: event.code, retryable: event.retryable });
        }
        case 'cancelled': {
          sawTerminal = true;
          throw new TypeError('Capability execution aborted');
        }
        case 'tool-call': {
          throw new TypeError('Unexpected tool-call event without tool loop configuration');
        }
      }
    }

    if (!sawTerminal) throw new TypeError('AI stream ended without terminal event');

    const aiResult = Object.freeze({
      requestId: prepared.request.requestId,
      content: Object.freeze([Object.freeze({ type: 'text' as const, text })]),
      usage: Object.freeze(usage),
      model: Object.freeze({
        id: prepared.binding.implementationId,
        capabilities: Object.freeze([prepared.binding.capability]),
      }),
      finishReason,
      toolCalls: Object.freeze([]),
      diagnosticId,
      metadata: Object.freeze({ source: 'simple-facade', mode: 'stream' }),
    }) as NormalizedAiResult;

    await this.#rememberTurn(context, prepared.objective, aiResult);

    yield {
      type: 'final',
      sequence: sequence++,
      result: Object.freeze({
        bindings: Object.freeze([prepared.binding]),
        aiResult,
        planId: `plan:${context.executionId}`,
        workflowId: prepared.workflowId,
        promptPackageId: prepared.promptPackageId,
        tools: EMPTY_TOOL_SUMMARY,
        ...(prepared.memory === undefined ? {} : { memory: prepared.memory }),
      }),
    };
  }

  async #executeAi(
    prepared: {
      readonly binding: CapabilityBinding;
      readonly request: Parameters<AiProviderFramework['execute']>[0];
      readonly messages: Parameters<AiProviderFramework['execute']>[0]['messages'];
      readonly objective: string;
      readonly workflowId: string;
      readonly promptPackageId: string;
    },
    context: ExecutionContext,
    signal: AbortSignal,
    control?: CapabilityExecutionControl,
    emit?: (event: CapabilityStreamEvent) => void | Promise<void>,
  ): Promise<{ readonly aiResult: NormalizedAiResult; readonly tools: EmbeddedToolCallSummary }> {
    try {
      if (this.toolLoopDeps !== undefined) {
        const outcome = await runEmbeddedToolLoop(
          this.toolLoopDeps,
          prepared.binding,
          context,
          prepared.messages,
          signal,
          control,
          emit,
          prepared.objective,
        );
        return Object.freeze({ aiResult: outcome.result, tools: outcome.tools });
      }
      const aiResult = await this.ai.execute(prepared.request);
      return Object.freeze({ aiResult, tools: EMPTY_TOOL_SUMMARY });
    } catch (error) {
      throw mapToolLoopError(error);
    }
  }

  async #rememberTurn(
    context: ExecutionContext,
    objective: string,
    aiResult: NormalizedAiResult,
  ): Promise<void> {
    if (this.memorySession === undefined) return;
    const assistantText = extractText(aiResult) ?? '';
    await this.memorySession.rememberTurn({
      executionId: context.executionId,
      correlationId: context.correlationId,
      decisionId: memoryDecisionId(context.executionId),
      userInput: objective,
      assistantText,
    });
  }

  async #prepare(
    work: unknown,
    context: ExecutionContext,
    signal: AbortSignal,
    streaming = false,
  ): Promise<{
    readonly binding: CapabilityBinding;
    readonly request: Parameters<AiProviderFramework['execute']>[0];
    readonly messages: Parameters<AiProviderFramework['execute']>[0]['messages'];
    readonly objective: string;
    readonly workflowId: string;
    readonly promptPackageId: string;
    readonly memory?: AgentMemoryDiagnostics;
  }> {
    const nodes = extractNodes(work);
    const objectiveAttr = context.attributes['objective'];
    const objective = typeof objectiveAttr === 'string' ? objectiveAttr : '';
    const node = nodes.find((item) => item.capability !== undefined);
    if (node === undefined || node.capability === undefined) {
      throw new TypeError('No capability binding resolved');
    }
    const snapshot = extractSnapshot(work);
    const binding = await this.resolver.resolve({
      requestId: `${context.executionId}:${node.nodeId}`,
      capability: node.capability,
      contractVersion: '1',
      context,
      node,
      constraints: Object.freeze({}),
    });

    let memoryBlock = '';
    let memory: AgentMemoryDiagnostics | undefined;
    if (this.memorySession !== undefined) {
      const retrieval = await this.memorySession.retrieveForPrompt({
        executionId: context.executionId,
        correlationId: context.correlationId,
        query: objective,
        decisionId: memoryDecisionId(context.executionId),
      });
      memoryBlock = formatMemoryForPrompt(retrieval, this.memorySession.durable === true);
      memory = Object.freeze({
        enabled: true as const,
        retrievedItemCount: retrieval.memories.length,
        injected: memoryBlock !== '',
        injectedPreview: truncatePreview(memoryBlock),
      });
    }

    const promptPackage = await this.prompts.build({
      instructions: this.instructions,
      userInput: objective,
      executionId: context.executionId,
      correlationId: context.correlationId,
      tenantId: this.tenantId,
      workspaceId: this.workspaceId,
      ...(memoryBlock === '' ? {} : { memoryBlock }),
    });

    const messages = Object.freeze([
      Object.freeze({
        role: 'system' as const,
        content: Object.freeze([
          Object.freeze({ type: 'text' as const, text: promptPackage.canonical }),
        ]),
      }),
      Object.freeze({
        role: 'user' as const,
        content: Object.freeze([Object.freeze({ type: 'text' as const, text: objective })]),
      }),
    ]);

    const request = Object.freeze({
      requestId: `${context.executionId}:${binding.bindingId}`,
      binding,
      context,
      messages,
      generation: Object.freeze({ maximumOutputTokens: 512 }),
      ...(streaming ? { streaming: Object.freeze({ enabled: true, includeUsage: true }) } : {}),
      metadata: Object.freeze({ source: 'simple-facade', promptPackageId: promptPackage.id }),
      constraints: Object.freeze({}),
      signal,
    });

    return Object.freeze({
      binding,
      request,
      messages,
      objective,
      workflowId: snapshot.workflowId,
      promptPackageId: promptPackage.id,
      ...(memory === undefined ? {} : { memory }),
    });
  }
}

function truncatePreview(text: string): string {
  if (text.length <= MEMORY_PREVIEW_MAX) return text;
  return `${text.slice(0, MEMORY_PREVIEW_MAX)}…`;
}

function memoryDecisionId(executionId: string): string {
  return `decision:embedded-memory:${executionId}`;
}

function extractText(aiResult: NormalizedAiResult): string | undefined {
  const parts = aiResult.content
    .filter((part): part is { readonly type: 'text'; readonly text: string } => part.type === 'text')
    .map((part) => part.text);
  if (parts.length === 0) return undefined;
  return parts.join('');
}

function mapToolLoopError(error: unknown): Error {
  if (error instanceof EmbeddedApprovalRequiredError) {
    return new SimpleAgentError('AGENT_TOOL_APPROVAL_REQUIRED', error.message, error.approvalId, {
      cause: error,
      approvalId: error.approvalId,
      executionId: error.executionId,
    });
  }
  if (!(error instanceof NormalizedToolError)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  switch (error.code) {
    case 'TOOL_AUTHORIZATION':
      return new SimpleAgentError('AGENT_TOOL_AUTHORIZATION', error.message, error.diagnosticId, {
        cause: error,
      });
    case 'TOOL_APPROVAL_REQUIRED':
      return new SimpleAgentError('AGENT_TOOL_APPROVAL_REQUIRED', error.message, error.diagnosticId, {
        cause: error,
      });
    case 'TOOL_REJECTED':
      return new SimpleAgentError('AGENT_TOOL_REJECTED', error.message, error.diagnosticId, {
        cause: error,
      });
    default:
      return new SimpleAgentError('AGENT_INVOKE_FAILED', error.message, error.diagnosticId, {
        cause: error,
      });
  }
}

function extractNodes(work: unknown): readonly NodeExecutionContract[] {
  if (typeof work !== 'object' || work === null || !('eligible' in work) || !Array.isArray(work.eligible)) {
    throw new TypeError('Runtime work has no eligible node contracts');
  }
  return work.eligible as readonly NodeExecutionContract[];
}

function extractSnapshot(work: unknown): { readonly workflowId: string } {
  if (typeof work !== 'object' || work === null || !('snapshot' in work)) {
    throw new TypeError('Runtime work has no workflow snapshot');
  }
  const snapshot = (work as { snapshot: { workflowId: string } }).snapshot;
  return Object.freeze({ workflowId: snapshot.workflowId });
}
