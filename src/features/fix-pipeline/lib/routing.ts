import type { FixCandidate, FixSeed, ReviewerSuggestion } from '@entities/fix-pipeline';

// Reviewer routing — Phase 2. Real impl reads CODEOWNERS + recent diff
// touch graph + per-reviewer load. Demo uses heuristics off the seed +
// candidate metrics so the suggestion is at least *consistent*: same
// inputs always pick the same reviewer.

export function suggestReviewer(seed: FixSeed, candidate: FixCandidate): ReviewerSuggestion {
  const securityTouched = candidate.metrics.securityPathTouched;
  const publicApi = candidate.metrics.publicApiChanged;

  // Choose primary based on the most material signal.
  if (publicApi) {
    return {
      primary: { handle: '@platform-team', role: 'platform', load: 'medium' },
      fallbacks: [
        { handle: '@hyejin', role: 'fallback', load: 'low' },
        { handle: '@jinwoo', role: 'fallback', load: 'medium' },
      ],
      rationale: 'public API 변경 — platform team 우선 검토 필요.',
    };
  }
  if (securityTouched) {
    return {
      primary: { handle: '@sec-review', role: 'security', load: 'low' },
      fallbacks: [
        { handle: '@platform-team', role: 'platform', load: 'medium' },
      ],
      rationale: 'security path — sec-review 그룹 우선.',
    };
  }
  // Owner heuristic — first evidence file's directory maps to a team.
  const firstFile = seed.evidenceRefs.find((r) => r.kind === 'file')?.label ?? '';
  if (firstFile.startsWith('src/checkout')) {
    return {
      primary: { handle: '@checkout-team', role: 'owner', load: 'medium' },
      fallbacks: [{ handle: '@hyejin', role: 'fallback', load: 'low' }],
      rationale: 'CODEOWNERS: src/checkout/** → @checkout-team.',
    };
  }
  if (firstFile.startsWith('src/auth')) {
    return {
      primary: { handle: '@auth-team', role: 'owner', load: 'high' },
      fallbacks: [
        { handle: '@sec-review', role: 'security', load: 'low' },
      ],
      rationale: 'CODEOWNERS: src/auth/** → @auth-team. load 높음 — fallback 가용.',
    };
  }
  return {
    primary: { handle: '@hyejin', role: 'owner', load: 'low' },
    fallbacks: [{ handle: '@jinwoo', role: 'fallback', load: 'medium' }],
    rationale: '최근 해당 영역에 commit한 contributor 기반 추천.',
  };
}
