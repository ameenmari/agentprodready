-- AgentProdReady v0.7 vector index profile down: reference-32
-- vector_schema_migrations row removal is owned by the migrator.

DROP INDEX IF EXISTS memory_vector_index_hnsw;
DROP TABLE IF EXISTS memory_vector_index;
DELETE FROM memory_vector_schema_contract WHERE profile_id = 'reference-32';
