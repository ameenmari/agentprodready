import {
  ProviderAdapterError,
  type AiExecutionRequest,
  type AiMessage,
  type NormalizedToolCall,
} from '@agentprodready/ai-provider';
import type { GeminiProviderConfig } from './config.js';

export type GeminiPart =
  | { readonly text: string }
  | {
      readonly functionCall: Readonly<{ readonly name: string; readonly args: Readonly<Record<string, unknown>> }>;
    }
  | {
      readonly functionResponse: Readonly<{
        readonly name: string;
        readonly response: Readonly<Record<string, unknown>>;
      }>;
    };

export interface GeminiContent {
  readonly role: 'user' | 'model';
  readonly parts: readonly GeminiPart[];
}

export interface GeminiFunctionDeclaration {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface GeminiTool {
  readonly functionDeclarations: readonly GeminiFunctionDeclaration[];
}

export interface GeminiGenerationConfig {
  readonly maxOutputTokens?: number;
  readonly temperature?: number;
  readonly topP?: number;
  readonly stopSequences?: readonly string[];
  readonly responseMimeType?: string;
}

export interface GeminiGenerateContentRequest {
  readonly model: string;
  readonly contents: readonly GeminiContent[];
  readonly systemInstruction?: string;
  readonly tools?: readonly GeminiTool[];
  readonly generationConfig?: GeminiGenerationConfig;
}

export function translateRequest(
  request: AiExecutionRequest,
  config: GeminiProviderConfig,
): GeminiGenerateContentRequest {
  const { systemInstruction, contents } = splitSystemAndContents(request.messages);
  const tools =
    request.tools === undefined || request.tools.length === 0
      ? undefined
      : Object.freeze([
          Object.freeze({
            functionDeclarations: Object.freeze(
              request.tools.map((tool) =>
                Object.freeze({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema,
                }),
              ),
            ),
          }),
        ]);

  const generationConfig = Object.freeze({
    ...(request.generation.maximumOutputTokens === undefined
      ? {}
      : { maxOutputTokens: request.generation.maximumOutputTokens }),
    ...(request.generation.temperature === undefined
      ? {}
      : { temperature: request.generation.temperature }),
    ...(request.generation.topP === undefined ? {} : { topP: request.generation.topP }),
    ...(request.generation.stop === undefined ? {} : { stopSequences: request.generation.stop }),
    ...(request.structuredOutput === undefined ? {} : { responseMimeType: 'application/json' }),
  });

  return Object.freeze({
    model: config.model,
    contents: Object.freeze(contents),
    ...(systemInstruction === undefined ? {} : { systemInstruction }),
    ...(tools === undefined ? {} : { tools }),
    ...(Object.keys(generationConfig).length === 0 ? {} : { generationConfig }),
  });
}

function splitSystemAndContents(messages: readonly AiMessage[]): {
  readonly systemInstruction?: string;
  readonly contents: readonly GeminiContent[];
} {
  const systemParts: string[] = [];
  let index = 0;
  while (index < messages.length) {
    const current = messages[index];
    if (current === undefined || current.role !== 'system') break;
    systemParts.push(textOf(current));
    index += 1;
  }

  const rest = messages.slice(index);
  const out: GeminiContent[] = [];

  for (const message of rest) {
    if (message.role === 'system') {
      throw new ProviderAdapterError(
        'invalid-request',
        'gemini-ai only supports leading system messages (converted to systemInstruction)',
        false,
      );
    }
    if (message.role === 'tool') {
      out.push(toFunctionResponseContent(message));
      continue;
    }
    if (message.role === 'assistant') {
      out.push(toModelContent(message));
      continue;
    }
    out.push(
      Object.freeze({
        role: 'user' as const,
        parts: Object.freeze([Object.freeze({ text: textOf(message) })]),
      }),
    );
  }

  if (out.length === 0) {
    throw new ProviderAdapterError('invalid-request', 'gemini-ai requires at least one non-system message', false);
  }

  const systemInstruction = systemParts.length === 0 ? undefined : systemParts.join('\n\n');
  return {
    ...(systemInstruction === undefined ? {} : { systemInstruction }),
    contents: Object.freeze(out),
  };
}

function toModelContent(message: AiMessage): GeminiContent {
  const text = textOf(message);
  const toolCalls = message.toolCalls ?? [];
  const parts: GeminiPart[] = [];
  if (text.trim() !== '') {
    parts.push(Object.freeze({ text }));
  }
  for (const call of toolCalls) {
    parts.push(toFunctionCallPart(call));
  }
  if (parts.length === 0) {
    throw new ProviderAdapterError('invalid-request', 'gemini-ai assistant messages require text or toolCalls', false);
  }
  return Object.freeze({ role: 'model', parts: Object.freeze(parts) });
}

function toFunctionResponseContent(message: AiMessage): GeminiContent {
  const name = message.name?.trim() ?? '';
  if (name === '') {
    throw new ProviderAdapterError(
      'invalid-request',
      'Tool messages require name (function name) for gemini-ai',
      false,
    );
  }
  const toolCallId = message.toolCallId?.trim() ?? '';
  if (toolCallId === '') {
    throw new ProviderAdapterError('invalid-request', 'Tool messages require toolCallId', false);
  }
  return Object.freeze({
    role: 'user',
    parts: Object.freeze([
      Object.freeze({
        functionResponse: Object.freeze({
          name,
          response: Object.freeze({ output: textOf(message), toolCallId }),
        }),
      }),
    ]),
  });
}

function toFunctionCallPart(call: NormalizedToolCall): GeminiPart {
  return Object.freeze({
    functionCall: Object.freeze({
      name: call.name,
      args: call.arguments,
    }),
  });
}

function textOf(message: AiMessage): string {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}
