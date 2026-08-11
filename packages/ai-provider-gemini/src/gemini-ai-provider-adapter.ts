import {
  ProviderAdapterError,
  type AiExecutionRequest,
  type AiProviderAdapter,
  type NormalizedAiResult,
  type NormalizedAiStreamEvent,
} from '@agentprodready/ai-provider';
import type { HealthResult } from '@agentprodready/foundation';
import {
  GoogleGenerativeAI,
  type Content,
  type FunctionDeclarationSchema,
  type GenerativeModel,
  type ModelParams,
  type Part,
  type RequestOptions,
  type Tool,
} from '@google/generative-ai';
import type { GeminiProviderConfig } from './config.js';
import { GEMINI_AI_ID } from './config.js';
import { translateError } from './translate-error.js';
import {
  translateRequest,
  type GeminiContent,
  type GeminiGenerateContentRequest,
  type GeminiPart,
  type GeminiTool,
} from './translate-request.js';
import { translateResponse, type GeminiGenerateContentResponse } from './translate-response.js';
import { translateGeminiStream, type GeminiGenerateContentChunk } from './translate-stream.js';

/** Test seam: Gemini generateContent surface only. */
export interface GeminiGenerativeClient {
  generateContent(
    body: GeminiGenerateContentRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<GeminiGenerateContentResponse>;
  generateContentStream(
    body: GeminiGenerateContentRequest,
    options?: { readonly signal?: AbortSignal },
  ): Promise<AsyncIterable<GeminiGenerateContentChunk>>;
}

export class GeminiProviderAdapter implements AiProviderAdapter {
  public readonly id: string;
  readonly #config: GeminiProviderConfig;
  readonly #client: GeminiGenerativeClient;

  public constructor(config: GeminiProviderConfig, client?: GeminiGenerativeClient) {
    this.#config = config;
    this.id = config.implementationId?.trim() || GEMINI_AI_ID;
    this.#client = client ?? createSdkClient(config);
  }

  public async execute(request: AiExecutionRequest): Promise<NormalizedAiResult> {
    try {
      const vendorRequest = translateRequest(request, this.#config);
      const response = await this.#client.generateContent(
        vendorRequest,
        request.signal === undefined ? undefined : { signal: request.signal },
      );
      return translateResponse(request, this.#config, response);
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async *stream(request: AiExecutionRequest): AsyncIterable<NormalizedAiStreamEvent> {
    if (request.streaming?.enabled !== true) {
      throw new ProviderAdapterError('invalid-request', 'Streaming must be explicitly enabled', false);
    }
    try {
      if (request.signal?.aborted) {
        yield { type: 'cancelled', sequence: 0, diagnosticId: `ai:${request.requestId}` };
        return;
      }
      const vendorRequest = translateRequest(request, this.#config);
      const chunks = await this.#client.generateContentStream(
        vendorRequest,
        request.signal === undefined ? undefined : { signal: request.signal },
      );
      yield* translateGeminiStream(request, chunks);
    } catch (error) {
      if (error instanceof ProviderAdapterError) throw error;
      throw translateError(error);
    }
  }

  public async health(): Promise<HealthResult> {
    return Object.freeze({ name: this.id, status: 'healthy' as const });
  }
}

function createSdkClient(config: GeminiProviderConfig): GeminiGenerativeClient {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const requestOptions: RequestOptions | undefined =
    config.baseUrl === undefined ? undefined : { baseUrl: config.baseUrl };

  return {
    async generateContent(
      body: GeminiGenerateContentRequest,
      options?: { readonly signal?: AbortSignal },
    ): Promise<GeminiGenerateContentResponse> {
      const model = createModel(genAI, body, requestOptions);
      const result = await model.generateContent(
        { contents: toSdkContents(body.contents) },
        options?.signal === undefined ? undefined : { signal: options.signal },
      );
      return toGenerateContentResponse(result.response);
    },
    async generateContentStream(
      body: GeminiGenerateContentRequest,
      options?: { readonly signal?: AbortSignal },
    ): Promise<AsyncIterable<GeminiGenerateContentChunk>> {
      const model = createModel(genAI, body, requestOptions);
      const result = await model.generateContentStream(
        { contents: toSdkContents(body.contents) },
        options?.signal === undefined ? undefined : { signal: options.signal },
      );
      return mapSdkStream(result.stream);
    },
  };
}

function createModel(
  genAI: GoogleGenerativeAI,
  body: GeminiGenerateContentRequest,
  requestOptions?: RequestOptions,
): GenerativeModel {
  const generationConfig =
    body.generationConfig === undefined
      ? undefined
      : {
          ...(body.generationConfig.maxOutputTokens === undefined
            ? {}
            : { maxOutputTokens: body.generationConfig.maxOutputTokens }),
          ...(body.generationConfig.temperature === undefined
            ? {}
            : { temperature: body.generationConfig.temperature }),
          ...(body.generationConfig.topP === undefined ? {} : { topP: body.generationConfig.topP }),
          ...(body.generationConfig.stopSequences === undefined
            ? {}
            : { stopSequences: [...body.generationConfig.stopSequences] }),
          ...(body.generationConfig.responseMimeType === undefined
            ? {}
            : { responseMimeType: body.generationConfig.responseMimeType }),
        };

  const modelParams: ModelParams = {
    model: body.model,
    ...(body.systemInstruction === undefined ? {} : { systemInstruction: body.systemInstruction }),
    ...(body.tools === undefined ? {} : { tools: toSdkTools(body.tools) }),
    ...(generationConfig === undefined || Object.keys(generationConfig).length === 0
      ? {}
      : { generationConfig }),
  };
  return genAI.getGenerativeModel(modelParams, requestOptions);
}

function toSdkContents(contents: readonly GeminiContent[]): Content[] {
  return contents.map((content) => ({
    role: content.role,
    parts: content.parts.map(toSdkPart),
  }));
}

function toSdkPart(part: GeminiPart): Part {
  if ('text' in part) {
    return { text: part.text };
  }
  if ('functionCall' in part) {
    return {
      functionCall: {
        name: part.functionCall.name,
        args: part.functionCall.args,
      },
    };
  }
  return {
    functionResponse: {
      name: part.functionResponse.name,
      response: part.functionResponse.response,
    },
  };
}

function toSdkTools(tools: readonly GeminiTool[]): Tool[] {
  return tools.map((tool) => ({
    functionDeclarations: tool.functionDeclarations.map((declaration) => ({
      name: declaration.name,
      description: declaration.description,
      parameters: structuredClone(declaration.parameters) as unknown as FunctionDeclarationSchema,
    })),
  }));
}

function toGenerateContentResponse(response: {
  readonly modelVersion?: string;
  readonly candidates?: readonly {
    readonly finishReason?: string;
    readonly content?: {
      readonly parts?: readonly {
        readonly text?: string;
        readonly functionCall?: { readonly name?: string; readonly args?: unknown };
      }[];
    };
  }[];
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
    readonly totalTokenCount?: number;
  };
}): GeminiGenerateContentResponse {
  const candidates = (response.candidates ?? []).map((candidate) =>
    Object.freeze({
      ...(candidate.finishReason === undefined ? {} : { finishReason: candidate.finishReason }),
      content: Object.freeze({
        parts: Object.freeze(
          (candidate.content?.parts ?? []).map((part) =>
            Object.freeze({
              ...(part.text === undefined ? {} : { text: part.text }),
              ...(part.functionCall === undefined
                ? {}
                : {
                    functionCall: Object.freeze({
                      ...(part.functionCall.name === undefined ? {} : { name: part.functionCall.name }),
                      ...(part.functionCall.args === undefined ? {} : { args: part.functionCall.args }),
                    }),
                  }),
            }),
          ),
        ),
      }),
    }),
  );

  return Object.freeze({
    ...(response.modelVersion === undefined ? {} : { model: response.modelVersion }),
    candidates: Object.freeze(candidates),
    ...(response.usageMetadata === undefined
      ? {}
      : {
          usageMetadata: Object.freeze({
            promptTokenCount: response.usageMetadata.promptTokenCount ?? 0,
            candidatesTokenCount: response.usageMetadata.candidatesTokenCount ?? 0,
            totalTokenCount: response.usageMetadata.totalTokenCount ?? 0,
          }),
        }),
  });
}

async function* mapSdkStream(stream: AsyncIterable<unknown>): AsyncIterable<GeminiGenerateContentChunk> {
  for await (const chunk of stream) {
    yield toGenerateContentResponse(chunk as Parameters<typeof toGenerateContentResponse>[0]);
  }
}
