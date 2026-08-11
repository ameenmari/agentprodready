import { TeamError } from '../errors.js';
import type { OrchestrationStrategy, TeamStrategyName } from '../types.js';
import {
  ConsensusStrategy,
  DebateReviewStrategy,
  DynamicAssignmentStrategy,
  HierarchicalStrategy,
} from './extended.js';
import { ParallelStrategy } from './parallel.js';
import { SequentialStrategy } from './sequential.js';
import { SupervisorStrategy } from './supervisor.js';

const registry: Readonly<Record<TeamStrategyName, () => OrchestrationStrategy>> = {
  sequential: () => new SequentialStrategy(),
  parallel: () => new ParallelStrategy(),
  supervisor: () => new SupervisorStrategy(),
  hierarchical: () => new HierarchicalStrategy(),
  consensus: () => new ConsensusStrategy(),
  'debate-review': () => new DebateReviewStrategy(),
  'dynamic-assignment': () => new DynamicAssignmentStrategy(),
};

export function resolveStrategy(name: TeamStrategyName): OrchestrationStrategy {
  const factory = registry[name];
  if (factory === undefined) {
    throw new TeamError(
      'TEAM_STRATEGY_UNSUPPORTED',
      `Strategy "${name}" is not registered`,
    );
  }
  return factory();
}

export {
  ConsensusStrategy,
  DebateReviewStrategy,
  DynamicAssignmentStrategy,
  HierarchicalStrategy,
  ParallelStrategy,
  SequentialStrategy,
  SupervisorStrategy,
};
export type { OrchestrationStrategy };
