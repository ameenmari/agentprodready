export {
  VECTOR_INDEX_PROFILES,
  VECTOR_STORE_PGVECTOR_PROVIDER_ID,
  loadVectorIndexProfile,
  loadVectorPostgresConfig,
  redactConnectionString,
  type VectorIndexProfile,
  type VectorPostgresConfig,
} from './config.js';
export {
  PgvectorVectorStore,
  type PgvectorVectorStoreOptions,
} from './pgvector-vector-store.js';
export { translatePgvectorError } from './pgvector-error-translation.js';
export {
  applyMigrations,
  migrationStatus,
  requiredMigrationsApplied,
  rollbackLastMigration,
  describeMigratorTarget,
  type MigrationStatusEntry,
} from './migrator.js';
