import type { ExecutionContextPackage } from '@agentprodready/context-assembly';
import {
  DefaultPromptPolicyEvaluator,
  InMemoryPromptDiagnostics,
  InMemoryPromptEvents,
  NoopPromptTelemetry,
  PromptBuilder,
  StableCanonicalPromptFormatter,
  type PromptPackage,
} from '@agentprodready/prompt-builder';

const SECURITY_LABEL = 'operations';

export class EmbeddedPromptService {
  readonly #builder = new PromptBuilder(
    new DefaultPromptPolicyEvaluator(),
    new StableCanonicalPromptFormatter(),
    new InMemoryPromptDiagnostics(),
    new InMemoryPromptEvents(),
    new NoopPromptTelemetry(),
  );

  public async build(params: {
    readonly instructions: string;
    readonly userInput: string;
    readonly executionId: string;
    readonly correlationId: string;
    readonly tenantId: string;
    readonly workspaceId: string;
  }): Promise<PromptPackage> {
    const context = syntheticContextPackage(params);
    return this.#builder.build({
      requestId: `prompt:${params.executionId}`,
      context,
      instructions: Object.freeze([
        Object.freeze({
          id: 'facade-instructions',
          hierarchy: 'system' as const,
          content: params.instructions,
          sourceReference: 'createAgent.instructions',
          sourceVersion: '1',
          securityLabels: Object.freeze([SECURITY_LABEL]),
          priority: 100,
        }),
      ]),
      profile: Object.freeze({
        id: 'conversational',
        version: '1',
        category: 'conversational' as const,
        supportedModalities: Object.freeze(['text' as const]),
        preferredSections: Object.freeze(['instructions' as const, 'objective' as const]),
        maximumLogicalUnits: 64,
        structuredOutput: Object.freeze({ required: false }),
        formatting: 'canonical-text' as const,
      }),
      policy: Object.freeze({
        version: 'prompt-policy:embedded',
        schemaVersion: 'prompt-1',
        selectedSections: Object.freeze(['instructions' as const, 'objective' as const]),
        sectionOrder: Object.freeze(['instructions' as const, 'objective' as const]),
        ordering: 'policy' as const,
        maximumLogicalUnits: 64,
        sectionBudgets: Object.freeze({}),
        minimumPriority: 0,
      }),
      correlation: Object.freeze({
        executionId: params.executionId,
        correlationId: params.correlationId,
      }),
      platformVersion: '1.0.0',
    });
  }
}

function syntheticContextPackage(params: {
  readonly userInput: string;
  readonly executionId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}): ExecutionContextPackage {
  return Object.freeze({
    id: `context:embedded:${params.executionId}`,
    requestId: `context-${params.executionId}`,
    status: 'complete' as const,
    execution: Object.freeze({
      executionId: params.executionId,
      correlationId: params.correlationId,
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      node: Object.freeze({
        workflowId: 'simple-workflow',
        nodeId: 'task-1',
        kind: 'capability' as const,
        capability: 'text-generation',
      }),
    }),
    elements: Object.freeze([
      Object.freeze({
        id: 'facade-objective',
        source: 'plan' as const,
        sourceReference: 'createAgent.invoke',
        sourceVersion: '1',
        content: Object.freeze({ objective: params.userInput }),
        metadata: Object.freeze({}),
        securityLabels: Object.freeze([SECURITY_LABEL]),
        priority: 80,
        logicalUnits: 1,
        ordinal: 0,
      }),
    ]),
    sources: Object.freeze([]),
    omissions: Object.freeze([]),
    security: Object.freeze({
      decisionId: 'decision:embedded-context',
      labels: Object.freeze([SECURITY_LABEL]),
    }),
    budget: Object.freeze({ maximum: 64, used: 1 }),
    versions: Object.freeze({
      schema: 'context-package-1',
      policy: 'prompt-policy:embedded',
      configuration: 'embedded-1',
      platform: '1.0.0',
      plan: 'simple-1',
      workflow: '1',
      knowledge: Object.freeze([]),
      memory: Object.freeze([]),
      runtime: '1',
    }),
    diagnosticId: `context-diagnostic:${params.executionId}`,
  });
}
