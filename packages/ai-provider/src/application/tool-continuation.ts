import { NormalizedAiError } from '../errors/ai-error.js';
import type { AiMessage, AiToolContinuationInput } from '../contracts/ai.js';

/**
 * AI Provider Framework owns translation to AiMessage[].
 * Adapters map AiMessage[] → vendor wire format.
 */
export function buildToolContinuationMessages(input: AiToolContinuationInput): readonly AiMessage[] {
  const callIds = input.toolCalls.map((call) => call.id);
  if (new Set(callIds).size !== callIds.length) {
    throw new NormalizedAiError('AI_INVALID_REQUEST', 'Duplicate toolCall ids in continuation toolCalls', false, 'ai:continuation');
  }
  const resultIds = input.results.map((result) => result.toolCallId);
  if (new Set(resultIds).size !== resultIds.length) {
    throw new NormalizedAiError('AI_INVALID_REQUEST', 'Duplicate toolCall ids in continuation results', false, 'ai:continuation');
  }
  if (callIds.length !== resultIds.length) {
    throw new NormalizedAiError('AI_INVALID_REQUEST', 'Continuation results must match toolCalls', false, 'ai:continuation');
  }
  for (const id of callIds) {
    if (!resultIds.includes(id)) {
      throw new NormalizedAiError('AI_INVALID_REQUEST', `Missing continuation result for toolCall ${id}`, false, 'ai:continuation');
    }
  }
  for (const id of resultIds) {
    if (!callIds.includes(id)) {
      throw new NormalizedAiError('AI_INVALID_REQUEST', `Unknown continuation result toolCall ${id}`, false, 'ai:continuation');
    }
  }

  const assistantContent = input.assistantContent ?? Object.freeze([]);
  const assistant: AiMessage = Object.freeze({
    role: 'assistant' as const,
    content: Object.freeze([...assistantContent]),
    toolCalls: Object.freeze(input.toolCalls.map((call) => Object.freeze({ ...call, arguments: { ...call.arguments } }))),
  });

  const toolMessages: AiMessage[] = input.toolCalls.map((call) => {
    const result = input.results.find((item) => item.toolCallId === call.id);
    if (result === undefined) {
      throw new NormalizedAiError('AI_INVALID_REQUEST', `Missing continuation result for toolCall ${call.id}`, false, 'ai:continuation');
    }
    return Object.freeze({
      role: 'tool' as const,
      toolCallId: call.id,
      content: Object.freeze([...result.content]),
      ...(result.metadata === undefined ? {} : { name: call.name }),
    });
  });

  return Object.freeze([...input.baseMessages.map(cloneMessage), assistant, ...toolMessages]);
}

function cloneMessage(message: AiMessage): AiMessage {
  return Object.freeze({
    role: message.role,
    content: Object.freeze([...message.content]),
    ...(message.name === undefined ? {} : { name: message.name }),
    ...(message.toolCallId === undefined ? {} : { toolCallId: message.toolCallId }),
    ...(message.toolCalls === undefined
      ? {}
      : {
          toolCalls: Object.freeze(message.toolCalls.map((call) => Object.freeze({ ...call, arguments: { ...call.arguments } }))),
        }),
  });
}
