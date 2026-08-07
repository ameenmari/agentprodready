import { describe, expect, it } from 'vitest';
import { NormalizedAiError } from '@agentprodready/ai-provider';
import { isFallbackEligibleAiError } from '@agentprodready/runtime';
import { loadLocalReferenceConfig } from './config/local-reference-config.js';

/**
 * Deterministic fault-injection classifications for v1.0.
 * Documents fail-closed vs degraded vs optional behavior without paid APIs.
 */
describe('v1.0 fault injection classifications', () => {
  it('AI unavailable / routing exhaustion are fail-closed for the AI capability path', () => {
    expect(isFallbackEligibleAiError('AI_UNAVAILABLE', true)).toBe(true);
    const exhausted = new NormalizedAiError('AI_UNAVAILABLE', 'exhausted', true, 'd');
    expect(exhausted.retryable).toBe(true);
  });

  it('postgres selected without DATABASE_URL fails closed at config', () => {
    expect(() =>
      loadLocalReferenceConfig({
        PERSISTENCE_PROVIDER: 'postgres',
      }),
    ).toThrow(/DATABASE_URL|POSTGRES/);
  });

  it('pgvector without connection fails closed when selected', () => {
    expect(() =>
      loadLocalReferenceConfig({
        VECTOR_SEARCH_ENABLED: 'true',
        VECTOR_STORE_PROVIDER: 'pgvector',
        EMBEDDING_PROVIDER: 'reference',
      }),
    ).toThrow(/DATABASE_URL|POSTGRES/);
  });

  it('optional evaluation off does not require durable result store', () => {
    const config = loadLocalReferenceConfig({
      EVALUATION_ENABLED: 'false',
      EVALUATION_RESULT_STORE: 'in-memory',
    });
    expect(config.evaluationEnabled).toBe(false);
  });

  it('tools disabled remains optional / inert', () => {
    const config = loadLocalReferenceConfig({ TOOLS_ENABLED: 'false' });
    expect(config.toolsEnabled).toBe(false);
  });

  it('invalid OpenAI key requirement when openai is mandatory in routing', () => {
    expect(() =>
      loadLocalReferenceConfig({
        AI_PROVIDER: 'openai',
        AI_ROUTING_MODE: 'fixed',
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });
});
