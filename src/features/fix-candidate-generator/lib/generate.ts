import type { CandidateDismissal, FixCandidate, FixSeed } from '@entities/fix-pipeline';
import { validateSeed } from '@entities/fix-pipeline';

// Mock candidate generator. The shape of the output is what matters — a
// real backend (LLM + static analysis) plugs in behind the same signature
// without touching the widget.
//
// MVP rule: emit one recommended candidate plus up to two clearly-rejected
// alternatives, each tagged with `rejectedReason`. Equal-weight lineups
// turn reviewers into pickers; "here's the one + here's why the others
// lost" forces a comparison the user can audit.

export type GenerateError = { kind: 'seed-rejected'; reason: string };

// Dismiss-feedback loop. Reasons accumulate from the user's prior
// dismissals on this seed and shape the *next* generation: a "too-broad"
// dismissal nudges the recommendation toward a smaller patch; "risky"
// nudges away from public-API or security touches; etc. Without this
// hook the dismiss button is just an audit log.
export function generateCandidates(
  seed: FixSeed,
  priorDismissals: CandidateDismissal[] = [],
): FixCandidate[] | GenerateError {
  const err = validateSeed(seed);
  if (err) {
    return { kind: 'seed-rejected', reason: `evidence 부족: ${err.kind}` };
  }
  const built = MOCK_BY_SEED[seed.id];
  const base = built ?? [genericRecommended(seed)];
  return applyDismissFeedback(base, priorDismissals);
}

// Re-rank / re-tag candidates based on accumulated dismissals. The MVP
// implementation is intentionally simple: the highest-priority reason
// wins, and we re-flag `isRecommended` accordingly. A real impl plugs
// this into the generator's prompt as a constraint.
function applyDismissFeedback(
  base: FixCandidate[],
  dismissals: CandidateDismissal[],
): FixCandidate[] {
  if (dismissals.length === 0) return base;
  const dismissedIds = new Set(dismissals.map((d) => d.candidateId));
  const reasons = new Set(dismissals.map((d) => d.reason));

  // Score each surviving candidate; recommend the top-scored one.
  const scored = base.map((c) => {
    if (dismissedIds.has(c.id)) return { c, score: -Infinity };
    let score = c.isRecommended ? 1 : 0;
    if (reasons.has('too-broad')) {
      // Smaller patches preferred.
      score += 5 - Math.min(5, c.metrics.linesChanged / 10);
    }
    if (reasons.has('risky')) {
      // Penalise public-API / security touches.
      if (c.metrics.publicApiChanged) score -= 3;
      if (c.metrics.securityPathTouched) score -= 1;
    }
    if (reasons.has('breaks-style')) {
      // Patches that touch fewer files less likely to introduce style drift.
      score += 2 - Math.min(2, c.metrics.filesChanged);
    }
    if (reasons.has('wrong-root-cause')) {
      // No reliable signal at the candidate level — stay neutral but
      // surface that the seed itself may need re-validation.
      score -= 0.5;
    }
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored.find((s) => s.score > -Infinity);
  if (!winner) return base;

  return base.map((c) => {
    if (dismissedIds.has(c.id)) return c;
    if (c.id === winner.c.id) {
      const wasRecommended = c.isRecommended;
      return wasRecommended
        ? c
        : {
            ...c,
            isRecommended: true,
            rejectedReason: undefined,
            rationale: `${c.rationale} (이전 dismissal 사유 반영해 재추천.)`,
          };
    }
    if (c.isRecommended) {
      return {
        ...c,
        isRecommended: false,
        rejectedReason: c.rejectedReason ?? '이전 dismissal로 재추천 우선순위 하락.',
      };
    }
    return c;
  });
}

function genericRecommended(seed: FixSeed): FixCandidate {
  return {
    id: `${seed.id}::cand-fallback`,
    seedId: seed.id,
    title: '보수적 가드 추가',
    rationale: '근본 원인보다 작게 — 입력 검증 한 줄을 추가해 즉시 차단하고, 후속 PR에서 구조 정리.',
    diff: [
      {
        file: seed.evidenceRefs[0]?.label ?? 'unknown',
        before: '// caller-side check absent',
        after: 'if (!isAllowed(input)) throw new Error("rejected");',
      },
    ],
    metrics: {
      linesChanged: 1,
      filesChanged: 1,
      modulesAffected: 1,
      publicApiChanged: false,
      securityPathTouched: seed.constraints?.securityPath ?? false,
    },
    isRecommended: true,
  };
}

// Hand-tuned candidates for the two sample seeds. Each set follows the
// "1 recommended + N rejected, each with reason" pattern so the UI can
// honestly show *why* the system narrowed down.
const MOCK_BY_SEED: Record<string, FixCandidate[]> = {
  'seed-sarif-001': [
    {
      id: 'seed-sarif-001::cand-spawn-args',
      seedId: 'seed-sarif-001',
      title: 'execSync → spawn(args[]) 분리 + allowlist',
      rationale: '인자 배열을 분리해 shell metacharacter 해석 자체를 차단. 명령은 사전 정의 allowlist에 한정.',
      diff: [
        {
          file: 'src/server/routes/admin.ts',
          before:
            'const cmd = req.body.cmd;\nexecSync(cmd);\nres.json({ ok: true });',
          after:
            'const { name, args } = parseAdminCmd(req.body);\nif (!ALLOWED.has(name)) return res.status(400).json({ err: "denied" });\nspawnSync(name, args, { shell: false });\nres.json({ ok: true });',
        },
      ],
      metrics: {
        linesChanged: 6,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: true,
      },
      isRecommended: true,
    },
    {
      id: 'seed-sarif-001::cand-shell-escape',
      seedId: 'seed-sarif-001',
      title: 'shell-escape로 입력 escape',
      rationale: '입력을 escape해 통과시키는 방식 — 함수 호출 한 줄 추가로 끝남.',
      diff: [
        {
          file: 'src/server/routes/admin.ts',
          before: 'execSync(cmd);',
          after: 'execSync(shellEscape(cmd));',
        },
      ],
      metrics: {
        linesChanged: 1,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: true,
      },
      isRecommended: false,
      rejectedReason: 'escape는 우회 패턴이 다양 — bypass 사례가 알려진 라이브러리 다수. spawn(args)이 본질 해결.',
    },
    {
      id: 'seed-sarif-001::cand-disable',
      seedId: 'seed-sarif-001',
      title: '엔드포인트 임시 비활성화',
      rationale: '경로를 503으로 막고 후속 PR에서 재구현.',
      diff: [
        {
          file: 'src/server/routes/admin.ts',
          before: 'router.post("/admin/exec", handler);',
          after: '// router.post("/admin/exec", handler); // disabled pending fix',
        },
      ],
      metrics: {
        linesChanged: 1,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: true,
        securityPathTouched: true,
      },
      isRecommended: false,
      rejectedReason: 'public endpoint 제거는 API 변경 — caller 영향 큼. 보안 패치보다 비용이 높음.',
    },
  ],
  'seed-incident-101': [
    {
      id: 'seed-incident-101::cand-defensive-parse',
      seedId: 'seed-incident-101',
      title: 'parseCart에 v1 호환 fallback 추가',
      rationale: 'strict parse 실패 시 v1 스키마로 한 번 더 시도. 502 즉시 차단, 후속 PR에서 정식 마이그레이션.',
      diff: [
        {
          file: 'src/checkout/cart.ts',
          before:
            'export function parseCart(payload: unknown) {\n  return CartSchema.parse(payload);\n}',
          after:
            'export function parseCart(payload: unknown) {\n  const v2 = CartSchema.safeParse(payload);\n  if (v2.success) return v2.data;\n  const v1 = LegacyCartSchema.safeParse(payload);\n  if (v1.success) return upgradeV1(v1.data);\n  throw new Error("cart payload 형식 오류");\n}',
        },
      ],
      metrics: {
        linesChanged: 7,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: false,
      },
      isRecommended: true,
    },
    {
      id: 'seed-incident-101::cand-route-catch',
      seedId: 'seed-incident-101',
      title: 'route 핸들러에 try/catch 추가',
      rationale: '5xx → 400 변환만으로 spike 종료. 근본 원인은 안 건드림.',
      diff: [
        {
          file: 'src/checkout/route.ts',
          before: 'const cart = parseCart(req.body);',
          after:
            'let cart;\ntry { cart = parseCart(req.body); }\ncatch { return res.status(400).json({ err: "invalid cart" }); }',
        },
      ],
      metrics: {
        linesChanged: 3,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: false,
      },
      isRecommended: false,
      rejectedReason: '에러를 가리는 패치 — legacy 스키마 진입 자체를 못 막음. incident는 잡혀도 데이터 손실 발생.',
    },
  ],
  'seed-hotspot-201': [
    {
      id: 'seed-hotspot-201::cand-extract-refresh',
      seedId: 'seed-hotspot-201',
      title: 'refreshToken을 별도 파일로 분리',
      rationale: 'session.ts churn의 60%가 refreshToken 관련. 파일 분리로 두 함수의 진화 속도 분리.',
      diff: [
        {
          file: 'src/auth/session.ts',
          before:
            'export function refreshToken(...) { /* 80 lines */ }\nexport function getSessionUser(...) { /* 40 lines */ }',
          after:
            'export { refreshToken } from "./refreshToken";\nexport function getSessionUser(...) { /* 40 lines */ }',
        },
        {
          file: 'src/auth/refreshToken.ts',
          before: '// (new file)',
          after: 'export function refreshToken(...) { /* 80 lines, moved from session.ts */ }',
        },
      ],
      metrics: {
        linesChanged: 12,
        filesChanged: 2,
        modulesAffected: 2,
        publicApiChanged: false,
        securityPathTouched: true,
      },
      isRecommended: true,
    },
    {
      id: 'seed-hotspot-201::cand-tests',
      seedId: 'seed-hotspot-201',
      title: 'session.ts에 회귀 테스트 강화',
      rationale: '구조는 그대로 두고 churn 빈도를 회귀 테스트로 흡수. 분리 비용 회피.',
      diff: [
        {
          file: 'src/auth/__tests__/session.spec.ts',
          before: '// 9 cases',
          after: '// 9 + 12 cases · refresh boundary, expiry races',
        },
      ],
      metrics: {
        linesChanged: 60,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: false,
      },
      isRecommended: false,
      rejectedReason: '테스트는 churn을 줄이지 않음 — 두 함수 entwined 구조가 본질적 비용.',
    },
  ],
  'seed-sarif-002': [
    {
      id: 'seed-sarif-002::cand-keyfilter',
      seedId: 'seed-sarif-002',
      title: '__proto__ / constructor 키 필터링',
      rationale: '재귀 머지 진입에서 위험 키를 거름. 서명 변경 없음 — 12개 callsite 안 건드림.',
      diff: [
        {
          file: 'src/shared/util/deepMerge.ts',
          before:
            'for (const k of Object.keys(src)) {\n  target[k] = merge(target[k], src[k]);\n}',
          after:
            'const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);\nfor (const k of Object.keys(src)) {\n  if (FORBIDDEN.has(k)) continue;\n  target[k] = merge(target[k], src[k]);\n}',
        },
      ],
      metrics: {
        linesChanged: 4,
        filesChanged: 1,
        modulesAffected: 1,
        publicApiChanged: false,
        securityPathTouched: true,
      },
      isRecommended: true,
    },
    {
      id: 'seed-sarif-002::cand-replace',
      seedId: 'seed-sarif-002',
      title: 'lodash.merge로 교체',
      rationale: '검증된 외부 구현으로 갈아치우기. callsite 모두 새 import로 마이그레이션.',
      diff: [
        {
          file: 'src/shared/util/deepMerge.ts',
          before: 'export function deepMerge(...) { /* custom */ }',
          after: 'export { merge as deepMerge } from "lodash";',
        },
      ],
      metrics: {
        linesChanged: 80,
        filesChanged: 13,
        modulesAffected: 6,
        publicApiChanged: true,
        securityPathTouched: true,
      },
      isRecommended: false,
      rejectedReason: 'public API 변경 + 13 파일 — security 핫픽스로 한 PR에 묶기엔 위험. blast가 과도.',
    },
  ],
};

// Synthesises the loading delay so the demo shows "생성 중..." UX without
// a real backend. Caller awaits this then receives the candidates.
export function simulateGenerate(
  seed: FixSeed,
  priorDismissals: CandidateDismissal[] = [],
  delayMs = 900,
): Promise<FixCandidate[] | GenerateError> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(generateCandidates(seed, priorDismissals));
    }, delayMs);
  });
}
