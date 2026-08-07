-- AgentProdReady v0.3 Blueprint 24 persistence schema (forward)

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS persistence_entities (
  repository TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NULL,
  data JSONB NOT NULL,
  revision BIGINT NOT NULL,
  version_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (repository, scope_key, id)
);

CREATE INDEX IF NOT EXISTS persistence_entities_tenant_idx
  ON persistence_entities (repository, tenant_id);

CREATE TABLE IF NOT EXISTS persistence_snapshots (
  id TEXT PRIMARY KEY,
  repository TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NULL,
  provider_boundary_id TEXT NOT NULL,
  entities JSONB NOT NULL,
  source_revision_digest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS persistence_migration_records (
  plan_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  provider_boundary_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  rollback_plan_reference TEXT NOT NULL
);
