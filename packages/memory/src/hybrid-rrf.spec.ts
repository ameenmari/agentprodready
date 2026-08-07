import { describe, expect, it } from 'vitest';
import { fuseHybridCandidates, HYBRID_RRF_K } from './hybrid-rrf.js';
import type { MemoryCandidate, MemoryRecord } from './index.js';

function record(id: string): MemoryRecord {
  return Object.freeze({
    id,
    sourceEventId: id,
    producer: 'test',
    execution: Object.freeze({ executionId: 'e', correlationId: 'c' }),
    ownership: Object.freeze({ tenantId: 'tenant' }),
    content: Object.freeze({ text: id }),
    metadata: Object.freeze({}),
    securityLabels: Object.freeze(['public']),
    classification: Object.freeze({
      category: 'episodic' as const,
      importance: 'normal' as const,
      lifetime: 'persistent' as const,
      visibility: 'user' as const,
    }),
    retention: Object.freeze({ policyId: 'r', category: 'permanent' as const }),
    version: '1',
    occurredAt: '2026-08-05T00:00:00.000Z',
    state: 'available' as const,
    lifecycleVersion: 4,
  });
}

function candidate(
  id: string,
  relevance: number,
  strategy: MemoryCandidate['searchStrategy'] = 'keyword',
): MemoryCandidate {
  return Object.freeze({
    record: record(id),
    relevance,
    frequency: 1,
    searchStrategy: strategy,
  });
}

describe('hybrid RRF formula', () => {
  it('uses k=60 by default', () => {
    expect(HYBRID_RRF_K).toBe(60);
  });

  it('computes RRF as sum 1/(k+rank) and normalizes by max', () => {
    const keyword = [candidate('a', 0.9), candidate('b', 0.5)];
    const semantic = [candidate('b', 0.8, 'semantic'), candidate('c', 0.4, 'semantic')];
    const fused = fuseHybridCandidates(keyword, semantic, 60);

    // ranks: keyword a=1 b=2; semantic b=1 c=2
    const rrfA = 1 / (60 + 1);
    const rrfB = 1 / (60 + 2) + 1 / (60 + 1);
    const rrfC = 1 / (60 + 2);
    const max = Math.max(rrfA, rrfB, rrfC);

    expect(fused.map((c) => c.record.id)).toEqual(['b', 'a', 'c']);
    expect(fused[0]?.relevance).toBeCloseTo(rrfB / max, 10);
    expect(fused[1]?.relevance).toBeCloseTo(rrfA / max, 10);
    expect(fused[2]?.relevance).toBeCloseTo(rrfC / max, 10);
    expect(fused.every((c) => c.searchStrategy === 'hybrid')).toBe(true);
    expect(fused.every((c) => c.relevance >= 0 && c.relevance <= 1)).toBe(true);
  });

  it('is deterministic for equal RRF via memory id tie-break', () => {
    const keyword = [candidate('z', 1), candidate('a', 1)];
    const semantic = [candidate('z', 1, 'semantic'), candidate('a', 1, 'semantic')];
    const first = fuseHybridCandidates(keyword, semantic);
    const second = fuseHybridCandidates(semantic, keyword);
    expect(first.map((c) => ({ id: c.record.id, r: c.relevance }))).toEqual(
      second.map((c) => ({ id: c.record.id, r: c.relevance })),
    );
  });

  it('returns empty when both sides empty', () => {
    expect(fuseHybridCandidates([], [])).toEqual([]);
  });
});
