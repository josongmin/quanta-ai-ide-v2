import type {
  FixCandidate,
  FixSeed,
  OpenPrConflict,
  ProofObligation,
  ValidationResult,
} from '@entities/fix-pipeline';

// Builds the proof-obligation list for a candidate. Three categories are
// rendered separately in UI; we generate them together because the inputs
// are the same — candidate metrics + seed constraints.
//
// MVP simulates results: static obligations pass when the patch looks
// reasonable, dynamic obligations stay in `pending` until "run validation"
// is invoked, stylistic obligations always run instantly. The store later
// replaces those with real engine outputs without touching this module.

export function buildObligations(
  seed: FixSeed,
  candidate: FixCandidate,
  conflicts: OpenPrConflict[] = [],
): ProofObligation[] {
  const obligations: ProofObligation[] = [];

  // ── static ──────────────────────────────────────────────────────────────

  if (seed.constraints?.securityPath) {
    obligations.push({
      id: `${candidate.id}::ob-taint`,
      category: 'static',
      label: 'taint path 제거됨',
      rationale: 'seed가 security path 라서 taint 흐름이 닫혔는지 확인.',
      status: 'pass',
      detail: 'source → sink 경로 1개 → 0개',
    });
  }

  obligations.push({
    id: `${candidate.id}::ob-blast`,
    category: 'static',
    label: 'blast radius bounded',
    rationale: '영향 모듈 수가 delivery gate 임계 안에 있는지.',
    status: candidate.metrics.modulesAffected <= 5 ? 'pass' : 'fail',
    detail: `영향 모듈 ${candidate.metrics.modulesAffected.toString()}개`,
  });

  obligations.push({
    id: `${candidate.id}::ob-types`,
    category: 'static',
    label: 'typecheck 통과',
    rationale: '인근 type 시그니처 회귀 없음.',
    status: 'pass',
  });

  if (candidate.metrics.publicApiChanged) {
    obligations.push({
      id: `${candidate.id}::ob-public-api`,
      category: 'static',
      label: 'public API 호환성',
      rationale: 'export 변경이 caller migration 없이 안전한가.',
      status: 'fail',
      detail: 'public surface 변경 — migration 단계 누락',
    });
  }

  // ── dynamic (MVP는 pending; "검증 실행" 버튼이 pass/fail/unknown으로 전이) ──

  obligations.push({
    id: `${candidate.id}::ob-tests`,
    category: 'dynamic',
    label: 'affected tests pass',
    rationale: 'change_impact가 지목한 테스트 집합이 환경에서 실제로 통과해야 함.',
    status: 'pending',
    detail: '실행 대기',
  });

  obligations.push({
    id: `${candidate.id}::ob-scan`,
    category: 'dynamic',
    label: 'security scan no-worse',
    rationale: '재스캔 결과 기준선 대비 신규 finding 0건.',
    status: 'pending',
    detail: '실행 대기',
  });

  // ── stylistic ───────────────────────────────────────────────────────────
  // Reviewers reject "doesn't look like our codebase" faster than logic
  // bugs. Keep these as separate obligations so the panel honestly shows
  // *which* axis fails when one does.

  obligations.push({
    id: `${candidate.id}::ob-style-convention`,
    category: 'stylistic',
    label: '주변 코드 컨벤션 일치',
    rationale: '에러 핸들링 / 네이밍 / import 스타일이 동일 모듈과 부합.',
    status: 'pass',
  });

  obligations.push({
    id: `${candidate.id}::ob-style-reuse`,
    category: 'stylistic',
    label: '기존 utility 재사용',
    rationale: '신규 helper를 만들지 않고 기존 abstraction 재사용 가능한가.',
    // Patches that touch new files (>1) more likely introduced a helper.
    status: candidate.metrics.filesChanged > 1 ? 'unknown' : 'pass',
    detail: candidate.metrics.filesChanged > 1 ? '신규 helper 가능성 — 검토 필요' : undefined,
  });

  obligations.push({
    id: `${candidate.id}::ob-style-lint`,
    category: 'stylistic',
    label: 'lint / format 규칙',
    rationale: '프로젝트 lint 통과 — dynamic validation에서 자동 반영.',
    status: 'pending',
    detail: 'dynamic validation 실행 시 결정',
  });

  // ── policy ──────────────────────────────────────────────────────────────
  // Secret-scan is Phase 1 mandatory per the spec's self-criticism: any
  // patch could leak a token from the codebase into the PR description or
  // diff context, so the gate runs on every candidate, not just security
  // seeds.

  obligations.push({
    id: `${candidate.id}::ob-secret-scan`,
    category: 'policy',
    label: 'secret / token 누설 없음',
    rationale: 'patch + PR description에 credentials / 내부 URL 노출 검사.',
    status: 'pass',
    detail: '0 findings',
  });

  if (seed.constraints?.securityPath ?? false) {
    obligations.push({
      id: `${candidate.id}::ob-policy-compliance`,
      category: 'policy',
      label: 'compliance 정책 위반 없음',
      rationale: '보안 경로 변경 — policy bundle의 forbidden 패턴 충돌 검사.',
      status: 'pass',
    });
  }

  // ── dynamic: open-PR conflict (peer change 충돌 감지) ─────────────────
  // Without this, the system confidently recommends a patch that overlaps
  // a teammate's in-flight PR — silent collision, exactly the failure mode
  // the spec calls out.

  if (conflicts.length > 0) {
    obligations.push({
      id: `${candidate.id}::ob-open-prs`,
      category: 'dynamic',
      label: 'open PR 충돌 없음',
      rationale: '동시 진행 PR과 파일 겹침 검사.',
      status: 'fail',
      detail: conflicts
        .map((c) => `#${c.prNumber.toString()} (${c.author}) — ${c.overlappingFiles.join(', ')}`)
        .join(' · '),
    });
  } else {
    obligations.push({
      id: `${candidate.id}::ob-open-prs`,
      category: 'dynamic',
      label: 'open PR 충돌 없음',
      rationale: '동시 진행 PR과 파일 겹침 검사.',
      status: 'pass',
      detail: '0 conflicts',
    });
  }

  // ── human ───────────────────────────────────────────────────────────────

  if (candidate.metrics.publicApiChanged || (seed.constraints?.publicApi ?? false)) {
    obligations.push({
      id: `${candidate.id}::ob-owner`,
      category: 'human',
      label: 'API owner 승인',
      rationale: 'public surface 영향 — owner 검토 강제.',
      status: 'pending',
      detail: '@platform-team',
    });
  }

  return obligations;
}

// Simulates a "run validation" action — flips dynamic + lint obligations
// from pending to a terminal status. Recommended candidates resolve to
// pass; non-recommended fall to `unknown` so the gate stays honest about
// what wasn't actually checked (the spec-mandated fallback).
export function simulateRunValidation(
  obligations: ProofObligation[],
  candidate: FixCandidate,
): ProofObligation[] {
  return obligations.map((ob) => {
    const isLintPending = ob.category === 'stylistic' && ob.status === 'pending';
    const isDynamicPending = ob.category === 'dynamic' && ob.status === 'pending';
    if (!isLintPending && !isDynamicPending) return ob;
    if (candidate.isRecommended) {
      const detail = ob.category === 'stylistic'
        ? 'lint clean · prettier ok'
        : '24/24 affected tests pass';
      return { ...ob, status: 'pass', detail };
    }
    return {
      ...ob,
      status: 'unknown',
      detail: '환경 제약으로 실행 불가 — human checkpoint 강제',
    };
  });
}

export function summariseObligations(
  candidateId: string,
  obligations: ProofObligation[],
): ValidationResult {
  let passed = 0;
  let failed = 0;
  let unknowns = 0;
  for (const ob of obligations) {
    if (ob.status === 'pass') passed += 1;
    else if (ob.status === 'fail') failed += 1;
    else if (ob.status === 'unknown') unknowns += 1;
  }
  // Dynamic-unreachable: any dynamic obligation that resolved to `unknown`.
  // This is the spec-mandated fallback signal. It does NOT include `pending`
  // (those just haven't run yet).
  const dynamicUnreachable = obligations.some(
    (ob) => ob.category === 'dynamic' && ob.status === 'unknown',
  );
  return {
    candidateId,
    obligations,
    passed,
    failed,
    unknowns,
    dynamicUnreachable,
  };
}
