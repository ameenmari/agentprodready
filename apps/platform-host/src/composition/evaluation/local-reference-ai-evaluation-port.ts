import type {
  AiExecutionRequest,
  AiProviderFramework,
  NormalizedAiResult,
} from '@agentprodready/ai-provider';
import type { CapabilityBinding, CapabilityResolver } from '@agentprodready/capability-resolution';
import type { ExecutionContextPackage } from '@agentprodready/context-assembly';
import type {
  EvaluatorDescriptor,
  EvaluatorTask,
  NormalizedAiAssessment,
  NormalizedAiEvaluationPort,
} from '@agentprodready/evaluation';
import { ExternalEvaluationError } from '@agentprodready/evaluation';
import type { ExecutionContext } from '@agentprodready/foundation';
import {
  DefaultPromptPolicyEvaluator,
  InMemoryPromptDiagnostics,
  InMemoryPromptEvents,
  NoopPromptTelemetry,
  PromptBuilder,
  StableCanonicalPromptFormatter,
  type PromptBuildRequest,
  type PromptPackage,
} from '@agentprodready/prompt-builder';
import { PRODUCT_VERSION } from '../../config/local-reference-config.js';

export const EVALUATION_JUDGE_CAPABILITY = 'evaluation.judge';

/**
 * Host NormalizedAiEvaluationPort: Cap → Prompt Builder → AI Provider → normalized assessment.
 * No vendor SDK imports.
 */
export class LocalReferenceAiEvaluationPort implements NormalizedAiEvaluationPort {
  private readonly promptBuilder = new PromptBuilder(
    new DefaultPromptPolicyEvaluator(),
    new StableCanonicalPromptFormatter(),
    new InMemoryPromptDiagnostics(),
    new InMemoryPromptEvents(),
    new NoopPromptTelemetry(),
  );

  public constructor(
    private readonly resolver: CapabilityResolver,
    private readonly ai: AiProviderFramework,
  ) {}

  public async assess(
    task: EvaluatorTask,
    evaluator: EvaluatorDescriptor,
  ): Promise<NormalizedAiAssessment> {
    try {
      const context = evaluationExecutionContext(task);
      const binding = await this.resolver.resolve(
        Object.freeze({
          requestId: `evaluation-ai:${task.requestId}:${task.criterion.id}`,
          capability: EVALUATION_JUDGE_CAPABILITY,
          context,
          node: Object.freeze({
            workflowId: 'evaluation',
            nodeId: 'judge',
            kind: 'capability' as const,
            capability: EVALUATION_JUDGE_CAPABILITY,
          }),
          constraints: Object.freeze({}),
        }),
      );

      const promptPackage = await this.promptBuilder.build(promptRequest(task));
      const aiResult = await this.ai.execute(aiRequest(task, binding, promptPackage, context));

      const matches =
        task.expected !== undefined &&
        JSON.stringify(task.target.artifact) === JSON.stringify(task.expected);
      const scoreValue = matches ? 1 : scoreFromAi(aiResult);

      return Object.freeze({
        output: Object.freeze({
          criterionId: task.criterion.id,
          evaluatorId: evaluator.id,
          evaluatorVersion: evaluator.version,
          outcome: 'scored' as const,
          score: Object.freeze({
            value: scoreValue,
            confidence: 1,
            schema: task.criterion.scoreSchema,
            semantics: 'ai-assisted-normalized',
          }),
          evidence: Object.freeze([
            Object.freeze({
              id: `evidence:ai:${task.criterion.id}`,
              type: 'explanation' as const,
              summary: 'AI-assisted evaluation completed through normalized Cap/Prompt/AI path',
              references: Object.freeze([
                task.target.reference,
                promptPackage.id,
                aiResult.diagnosticId,
              ]),
              provenance: Object.freeze([...task.target.provenance]),
              security: Object.freeze({ ...task.security, labels: [...task.security.labels] }),
              version: '1',
            }),
          ]),
          explanation: 'Normalized AI-assisted assessment',
          limitations: Object.freeze(['probabilistic-judge']),
          metadata: Object.freeze({ method: 'normalized-ai-judge' }),
        }),
        capabilityBindingReference: binding.bindingId,
        promptPackageReference: promptPackage.id,
        normalizedAiResultReference: aiResult.diagnosticId,
      });
    } catch (error) {
      if (error instanceof ExternalEvaluationError) throw error;
      throw new ExternalEvaluationError(
        'ai',
        error instanceof Error ? error.message : 'AI-assisted evaluation failed',
      );
    }
  }
}

function evaluationExecutionContext(task: EvaluatorTask): ExecutionContext {
  return Object.freeze({
    executionId: task.correlation.executionId,
    correlationId: task.correlation.correlationId,
    tenantId: task.security.tenantId,
    ...(task.security.workspaceId === undefined ? {} : { workspaceId: task.security.workspaceId }),
    startedAt: new Date().toISOString(),
    configurationVersion: 'evaluation-1',
    securityContextId: task.security.decisionId,
    attributes: Object.freeze({
      objective: `evaluate:${task.criterion.id}`,
      criterion: task.criterion.id,
    }),
  });
}

function promptRequest(task: EvaluatorTask): PromptBuildRequest {
  const contextPackage = minimalContextPackage(task);
  return Object.freeze({
    requestId: `prompt-eval:${task.requestId}:${task.criterion.id}`,
    context: contextPackage,
    instructions: Object.freeze([
      Object.freeze({
        id: 'eval-instruction',
        hierarchy: 'execution' as const,
        content: `Assess criterion ${task.criterion.name}: ${task.criterion.description}`,
        sourceReference: task.target.reference,
        sourceVersion: task.target.version,
        securityLabels: Object.freeze([...task.security.labels]),
        priority: 100,
      }),
    ]),
    profile: Object.freeze({
      id: 'evaluation-judge',
      version: '1',
      category: 'evaluation' as const,
      supportedModalities: Object.freeze(['text' as const]),
      preferredSections: Object.freeze(['instructions' as const, 'execution' as const]),
      maximumLogicalUnits: 32,
      structuredOutput: Object.freeze({ required: false }),
      formatting: 'canonical-text' as const,
    }),
    policy: Object.freeze({
      version: 'prompt-policy:local',
      schemaVersion: 'prompt-1',
      selectedSections: Object.freeze(['instructions' as const, 'execution' as const]),
      sectionOrder: Object.freeze(['instructions' as const, 'execution' as const]),
      ordering: 'policy' as const,
      maximumLogicalUnits: 32,
      sectionBudgets: Object.freeze({}),
      minimumPriority: 0,
    }),
    correlation: Object.freeze({
      executionId: task.correlation.executionId,
      correlationId: task.correlation.correlationId,
    }),
    platformVersion: PRODUCT_VERSION,
  });
}

function minimalContextPackage(task: EvaluatorTask): ExecutionContextPackage {
  const node = Object.freeze({
    workflowId: 'evaluation',
    nodeId: 'judge',
    kind: 'capability' as const,
    capability: EVALUATION_JUDGE_CAPABILITY,
  });
  return Object.freeze({
    id: `context:evaluation:${task.requestId}`,
    requestId: `context-${task.requestId}`,
    status: 'complete' as const,
    execution: Object.freeze({
      executionId: task.correlation.executionId,
      correlationId: task.correlation.correlationId,
      tenantId: task.security.tenantId,
      ...(task.security.workspaceId === undefined ? {} : { workspaceId: task.security.workspaceId }),
      node,
    }),
    elements: Object.freeze([
      Object.freeze({
        id: 'eval-target',
        source: 'runtime' as const,
        sourceReference: task.target.reference,
        sourceVersion: task.target.version,
        content: Object.freeze({ type: task.target.type }),
        metadata: Object.freeze({}),
        securityLabels: Object.freeze([...task.security.labels]),
        priority: 50,
        logicalUnits: 1,
        ordinal: 0,
      }),
    ]),
    sources: Object.freeze([]),
    omissions: Object.freeze([]),
    security: Object.freeze({
      decisionId: task.security.decisionId,
      labels: Object.freeze([...task.security.labels]),
    }),
    budget: Object.freeze({ maximum: 32, used: 1 }),
    versions: Object.freeze({
      schema: 'context-package-1',
      policy: 'evaluation-local',
      configuration: 'evaluation-1',
      platform: PRODUCT_VERSION,
      plan: 'n/a',
      workflow: '0',
      knowledge: Object.freeze([]),
      memory: Object.freeze([]),
      runtime: 'evaluation-1',
    }),
    diagnosticId: `context-diagnostic:${task.requestId}`,
  });
}

function aiRequest(
  task: EvaluatorTask,
  binding: CapabilityBinding,
  promptPackage: PromptPackage,
  context: ExecutionContext,
): AiExecutionRequest {
  return Object.freeze({
    requestId: `ai-eval:${task.requestId}:${task.criterion.id}`,
    binding,
    context,
    messages: Object.freeze([
      Object.freeze({
        role: 'user' as const,
        content: Object.freeze([
          Object.freeze({
            type: 'text' as const,
            text: promptPackage.canonical || task.criterion.description,
          }),
        ]),
      }),
    ]),
    generation: Object.freeze({ maximumOutputTokens: 64 }),
    metadata: Object.freeze({ source: 'evaluation-judge' }),
    constraints: Object.freeze({}),
  });
}

function scoreFromAi(result: NormalizedAiResult): number {
  const text = result.content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .toLowerCase();
  if (text.includes('fail') || text.includes('incorrect')) return 0;
  return 1;
}
