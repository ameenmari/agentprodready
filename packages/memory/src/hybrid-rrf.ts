import type { MemoryCandidate } from './index.js';

/** Reciprocal Rank Fusion constant (approved v0.7). */
export const HYBRID_RRF_K = 60;

/**
 * Fuse keyword + semantic candidate lists with RRF.
 * Each source is sorted by relevance desc, memory id asc before ranking.
 * Fused relevance = rrfScore / maxRrf over the fused set, clamped to [0,1].
 */
export function fuseHybridCandidates(
  keyword: readonly MemoryCandidate[],
  semantic: readonly MemoryCandidate[],
  k: number = HYBRID_RRF_K,
): readonly MemoryCandidate[] {
  const keywordSorted = sortCandidates(keyword);
  const semanticSorted = sortCandidates(semantic);
  const scores = new Map<string, { rrf: number; record: MemoryCandidate['record'] }>();

  accumulate(keywordSorted, scores, k);
  accumulate(semanticSorted, scores, k);

  let maxRrf = 0;
  for (const entry of scores.values()) {
    if (entry.rrf > maxRrf) maxRrf = entry.rrf;
  }
  if (maxRrf <= 0) return Object.freeze([]);

  const fused = [...scores.entries()]
    .map(([id, entry]) =>
      Object.freeze({
        record: entry.record,
        relevance: Math.min(1, entry.rrf / maxRrf),
        frequency: 1,
        searchStrategy: 'hybrid' as const,
        _id: id,
      }),
    )
    .sort((a, b) => b.relevance - a.relevance || a._id.localeCompare(b._id))
    .map(({ record, relevance, frequency, searchStrategy }) =>
      Object.freeze({ record, relevance, frequency, searchStrategy }),
    );

  return Object.freeze(fused);
}

function sortCandidates(values: readonly MemoryCandidate[]): readonly MemoryCandidate[] {
  return [...values].sort(
    (a, b) => b.relevance - a.relevance || a.record.id.localeCompare(b.record.id),
  );
}

function accumulate(
  sorted: readonly MemoryCandidate[],
  scores: Map<string, { rrf: number; record: MemoryCandidate['record'] }>,
  k: number,
): void {
  sorted.forEach((candidate, index) => {
    const rank = index + 1;
    const contribution = 1 / (k + rank);
    const current = scores.get(candidate.record.id);
    if (current === undefined) {
      scores.set(candidate.record.id, { rrf: contribution, record: candidate.record });
      return;
    }
    scores.set(candidate.record.id, {
      rrf: current.rrf + contribution,
      record: candidate.relevance >= (findRelevance(sorted, candidate.record.id) ?? 0)
        ? candidate.record
        : current.record,
    });
  });
}

function findRelevance(sorted: readonly MemoryCandidate[], id: string): number | undefined {
  return sorted.find((c) => c.record.id === id)?.relevance;
}
