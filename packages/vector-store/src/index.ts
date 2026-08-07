export type {
  VectorDistanceMetric,
  VectorIndexIdentity,
  VectorMatch,
  VectorQueryRequest,
  VectorRecord,
  VectorStorePort,
  VectorUpsertRequest,
} from './contracts.js';
export { VectorStoreError, type VectorStoreErrorCode } from './errors.js';
export {
  InMemoryVectorStore,
  type InMemoryVectorStoreOptions,
} from './in-memory-vector-store.js';
