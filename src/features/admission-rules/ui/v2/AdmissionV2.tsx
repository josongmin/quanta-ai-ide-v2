import { useMemo, useState } from 'react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@entities/filter-state';
import { simulateBranchDiff } from '@entities/repo';
import { previewRule, evaluateAdmission } from '@entities/admission';
import { usePrPreview } from '@features/pr-preview';
import { pageBackground } from '@shared/lib';
import { useAdmissionStore } from '../../model/store';
import { AmbientLayer } from './parts/AmbientLayer';
import { Sidebar, type V2Page } from './parts/Sidebar';
import { HealthPage } from './parts/HealthPage';
import { RulesPage } from './parts/RulesPage';
import { GatePage } from './parts/GatePage';
import { RETRO_SEEDS } from './parts/retrospective';

// TODO(i18n): AdmissionV2 is being migrated incrementally.
// The first pass (D6) covers the most-visible labels (sidebar verdict, decision
// flow, sync status, gate verdict empty + override modal). Most other strings
// in this file (rule editor copy, ambient ticker, retroactive heat-bar legend,
// etc.) still need translation — see audit notes for follow-up.

// Admission v2 — full-dark "control room" layout. Hard-pinned to dark
// tokens; light mode is intentionally not supported here.
//
// The screen is one composition rather than a stack of widgets:
//
//   ┌── HERO BANNER (verdict aurora + ticker)─────────────────────┐
//   │                                                              │
//   ├── LEFT cockpit ─┬── CENTER constellation ─┬── RIGHT stream ─┤
//   │ live signals    │  rule constellation     │  PR live feed   │
//   │ rule sources    │  (svg + nodes + edges)  │  recent PR rows │
//   │ cost ledger     │  fired-rule inspector   │                 │
//   ├─────────────────┴──────────────────────────┴─────────────────┤
//   │  DECISION RIBBON  (this PR's flow through rules)            │
//   ├──────────────────────────────────────────────────────────────┤
//   │  RETROACTIVE 30d (heat bars + summary)                      │
//   └──────────────────────────────────────────────────────────────┘
//
// Heavy use of motion (CSS keyframes), spotlight cursor effects, and
// SVG dashed connectors so the surface feels alive rather than static.
//
// IA — three pages, one shell.
//   • Health  — at-a-glance dashboard (was the whole v2 surface)
//   • Rules   — author / preview / impact-simulate rules
//   • Gate    — current PR's verdict, fired rules, override workflow
//
// All three share: page background, ambient aurora, telemetry tape, and
// the left sidebar. Each page renders its own composition inside the
// scroll area.

export default function AdmissionV2() {
  const { isDark } = useTheme();
  const repo = useFilterStore((s) => s.repo);
  const rules = useAdmissionStore((s) => s.rules);
  const { diff, seed, regenerate, start, active } = usePrPreview();
  const [page, setPage] = useState<V2Page>('health');

  const effectiveSeed = seed ?? 42;
  const effectiveDiff = useMemo(
    () => diff ?? simulateBranchDiff(repo, effectiveSeed),
    [diff, repo, effectiveSeed],
  );
  const decision = useMemo(
    () => evaluateAdmission(rules, repo, effectiveDiff),
    [rules, repo, effectiveDiff],
  );
  const previews = useMemo(() => {
    const out = new Map<string, ReturnType<typeof previewRule>>();
    for (const r of rules) out.set(r.id, previewRule(r, repo));
    return out;
  }, [rules, repo]);
  const retro = useMemo(
    () => RETRO_SEEDS.map((s) => {
      const d = simulateBranchDiff(repo, s);
      return { seed: s, diff: d, decision: evaluateAdmission(rules, repo, d) };
    }),
    [rules, repo],
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden flex"
      data-v2-theme={isDark ? 'dark' : 'light'}
      style={pageBackground(isDark)}
    >
      <AmbientLayer isDark={isDark} />

      <Sidebar
        active={page}
        onChange={setPage}
        decision={decision}
        rules={rules}
      />

      <main className="flex-1 min-w-0 relative overflow-auto">
        {page === 'health' && (
          <HealthPage
            decision={decision}
            diff={effectiveDiff}
            seed={effectiveSeed}
            onRegenerate={active ? regenerate : start}
            rules={rules}
            previews={previews}
            retro={retro}
          />
        )}
        {page === 'rules' && <RulesPage rules={rules} previews={previews} retro={retro} />}
        {page === 'gate'  && (
          <GatePage
            decision={decision}
            diff={effectiveDiff}
            seed={effectiveSeed}
            onRegenerate={active ? regenerate : start}
          />
        )}
      </main>
    </div>
  );
}
