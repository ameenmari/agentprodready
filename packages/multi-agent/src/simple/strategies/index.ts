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
  return registry[name]();
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
