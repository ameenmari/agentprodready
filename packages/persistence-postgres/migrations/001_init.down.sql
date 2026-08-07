-- AgentForge v0.3 Blueprint 24 persistence schema (down — local/test reset only)
-- schema_migrations row removal is owned by the migrator; do not drop that table here.

DROP TABLE IF EXISTS persistence_migration_records;
DROP TABLE IF EXISTS persistence_snapshots;
DROP TABLE IF EXISTS persistence_entities;
