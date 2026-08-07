import type {
  Evaluator,
  EvaluatorDescriptor,
  EvaluatorOutput,
  EvaluatorTask,
} from '@agentforge/evaluation';
import { WeightedCompositeEvaluator } from '@agentforge/evaluation';

/**
 * Host wrapper exposing composite category through Evaluator contract,
 * reusing WeightedCompositeEvaluator for aggregation semantics.
 */
export class LocalCompositeEvaluator implements Evaluator {
  public readonly descriptor: EvaluatorDescriptor;
  private readonly composite = new WeightedCompositeEvaluator('composite-local', '1');

  public constructor(id = 'composite-local', version = '1') {
    this.descriptor = Object.freeze({
      id,
      version,
      category: 'composite',
      supportedTargets: Object.freeze([
        'plan',
        'workflow-definition',
        'workflow-execution',
        'node-output',
        'knowledge-result',
        'memory-result',
        'context-package',
        'prompt-package',
        'ai-result',
        'tool-result',
        'execution-result',
        'comparative-set',
      ] as const),
      supportedCriteria: Object.freeze([
        'correctness',
        'relevance',
        'completeness',
        'consistency',
        'safety',
        'groundedness',
        'instruction-adherence',
        'efficiency',
        'robustness',
        'user-outcome',
      ] as const),
      deterministic: true,
    });
  }

  public async evaluate(task: EvaluatorTask): Promise<EvaluatorOutput> {
    const matches =
      task.expected !== undefined &&
      JSON.stringify(task.target.artifact) === JSON.stringify(task.expected);
    const evidence = Object.freeze([
      Object.freeze({
        id: `evidence:composite:${task.criterion.id}`,
        type: 'comparison' as const,
        summary: `composite:${String(matches)}`,
        references: Object.freeze([task.target.reference]),
        provenance: Object.freeze([...task.target.provenance]),
        security: Object.freeze({ ...task.security, labels: [...task.security.labels] }),
        version: '1',
      }),
    ]);
    const component = (value: number, evaluatorId: string): EvaluatorOutput =>
      Object.freeze({
        criterionId: task.criterion.id,
        evaluatorId,
        evaluatorVersion: '1',
        outcome: 'scored' as const,
        score: Object.freeze({
          value,
          confidence: 1,
          schema: task.criterion.scoreSchema,
          semantics: 'component',
        }),
        evidence,
        explanation: 'component',
        limitations: Object.freeze([]),
        metadata: Object.freeze({}),
      });
    const primary = matches ? 1 : 0;
    return this.composite.combine(task, [component(primary, 'component-a'), component(primary, 'component-b')]);
  }

  public async health(): Promise<Readonly<{ name: string; status: 'healthy' }>> {
    return Object.freeze({ name: this.descriptor.id, status: 'healthy' });
  }
}
