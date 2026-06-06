import type { Routine } from '../types';

export type DryRunResult = {
  prs: number;
  lines: number;
  usd: number;
  candidates: { kind: string; title: string; added: number; removed: number }[];
};

// Synthetic dry-run — derives a deterministic preview from the routine
// definition. Real impl would replay the routine's analyzers against
// yesterday's repo snapshot.
export function simulateDryRun(r: Routine): DryRunResult {
  const trustWeight = r.trustLevel >= 4 ? 1 : r.trustLevel >= 3 ? 0.6 : 0.3;
  const guardScale = Math.min(1, r.guardrails.maxLocPerPr / 100);
  const baseFromKind: Record<string, { prs: number; lpr: number; cost: number; samples: { kind: string; title: string; added: number; removed: number }[] }> = {
    'quality-sweeper': {
      prs: 6, lpr: 14, cost: 0.6, samples: [
        { kind: 'lint', title: 'chore: remove unused imports in packages/cli', added: 0, removed: 18 },
        { kind: 'type', title: 'chore: tighten Awaited<T> usage in api/handlers', added: 6, removed: 4 },
        { kind: 'lint', title: 'chore: drop dead branch in router/middleware', added: 0, removed: 9 },
      ],
    },
    'dead-code': {
      prs: 1, lpr: 142, cost: 4, samples: [
        { kind: 'remove', title: 'chore: drop legacy v1 webhook handler', added: 0, removed: 142 },
      ],
    },
    'flaky-tests': {
      prs: 2, lpr: 24, cost: 0.9, samples: [
        { kind: 'test', title: 'fix(test): retry-with-jitter on receipt session race', added: 18, removed: 4 },
      ],
    },
    'dep-caretaker': {
      prs: 3, lpr: 22, cost: 1.2, samples: [
        { kind: 'deps', title: 'deps: bump zod 3.23 → 3.24', added: 1, removed: 1 },
        { kind: 'deps', title: 'deps: bump @vitejs/plugin-react minor', added: 8, removed: 8 },
      ],
    },
    'perf-hunter': { prs: 0, lpr: 0, cost: 0, samples: [] },
    'docs-drift': {
      prs: 4, lpr: 9, cost: 0.3, samples: [
        { kind: 'docs', title: 'docs: sync withSession docstring with new signature', added: 6, removed: 3 },
      ],
    },
  };
  const base = baseFromKind[r.kind] ?? { prs: 0, lpr: 0, cost: 0, samples: [] };
  const prs = Math.max(0, Math.round(base.prs * trustWeight * (0.5 + guardScale)));
  const lines = Math.round(base.lpr * prs);
  const usd = Math.min(r.budget.dailyUsd, base.cost * Math.max(1, prs / Math.max(1, base.prs)));
  return { prs, lines, usd, candidates: base.samples.slice(0, Math.max(0, prs)) };
}
