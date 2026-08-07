-- AgentForge v0.7 vector index profile: openai-1536-small

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_vector_index (
  memory_id           text        NOT NULL,
  tenant_id           text        NOT NULL,
  embedding           vector(1536) NOT NULL,
  embedding_model     text        NOT NULL,
  embedding_model_ver text        NULL,
  dimensions          integer     NOT NULL,
  content_version     text        NOT NULL,
  lifecycle_version   integer     NOT NULL,
  created_at          timestamptz NOT NULL,
  updated_at          timestamptz NOT NULL,
  metadata            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, memory_id)
);

CREATE INDEX IF NOT EXISTS memory_vector_index_hnsw
  ON memory_vector_index
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS memory_vector_schema_contract (
  profile_id          text        PRIMARY KEY,
  embedding_model_id  text        NOT NULL,
  dimensions          integer     NOT NULL,
  metric              text        NOT NULL,
  applied_at          timestamptz NOT NULL
);

INSERT INTO memory_vector_schema_contract (
  profile_id,
  embedding_model_id,
  dimensions,
  metric,
  applied_at
) VALUES (
  'openai-1536-small',
  'text-embedding-3-small',
  1536,
  'cosine',
  NOW()
)
ON CONFLICT (profile_id) DO UPDATE SET
  embedding_model_id = EXCLUDED.embedding_model_id,
  dimensions = EXCLUDED.dimensions,
  metric = EXCLUDED.metric,
  applied_at = EXCLUDED.applied_at;
