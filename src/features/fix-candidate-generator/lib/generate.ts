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

export function generateCandidates(seed: FixSeed): FixCandidate[] | GenerateError {
  const err = validateSeed(seed);
  if (err) {
    return { kind: 'seed-rejected', reason: `evidence 부족: ${err.kind}` };
  }
  const built = MOCK_BY_SEED[seed.id];
  if (built) return built;
  // Generic fallback: a single conservative rename-style fix. Lets new
  // demo seeds added later still produce *something* without code changes.
  return [genericRecommended(seed)];
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
export function simulateGenerate(seed: FixSeed, delayMs = 900): Promise<FixCandidate[] | GenerateError> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(generateCandidates(seed));
    }, delayMs);
  });
}
