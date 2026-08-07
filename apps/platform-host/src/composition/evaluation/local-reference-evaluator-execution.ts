import type {
  Evaluator,
  EvaluatorExecutionPort,
  EvaluatorOutput,
  EvaluatorTask,
  EvaluationPolicy,
} from '@agentforge/evaluation';

/**
 * Host adapter for Blueprint 14 EvaluatorExecutionPort.
 * Honors sequential/parallel semantic mode. Does not implement scoring,
 * provider SDKs, or production Runtime timeout/retry/recovery policies.
 */
export class LocalReferenceEvaluatorExecution implements EvaluatorExecutionPort {
  public readonly modes: EvaluationPolicy['executionMode'][] = [];

  public async execute(
    tasks: readonly Readonly<{ evaluator: Evaluator; task: EvaluatorTask }>[],
    mode: EvaluationPolicy['executionMode'],
  ): Promise<readonly EvaluatorOutput[]> {
    this.modes.push(mode);
    if (mode === 'parallel') {
      return Object.freeze(
        await Promise.all(tasks.map(async (value) => value.evaluator.evaluate(value.task))),
      );
    }
    const outputs: EvaluatorOutput[] = [];
    for (const value of tasks) {
      outputs.push(await value.evaluator.evaluate(value.task));
    }
    return Object.freeze(outputs);
  }
}
