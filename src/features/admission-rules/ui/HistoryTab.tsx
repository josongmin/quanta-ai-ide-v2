import { useMemo } from 'react';
import { useTheme } from '@shared/theme';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff } from '@entities/repo';
import { evaluateAdmission } from '@entities/admission';
import { useTranslation } from '@shared/i18n';
import { useAdmissionStore } from '../model/store';
import { SEVERITY_COLOR, SOURCE_GLYPH } from './sourceStyle';
import { tokens } from '@shared/lib';

// Replay 30 days of synthetic PRs against the current ruleset.
// Single-column table. Outcome is the only colour signal — fired-rule
// chips stay neutral and rely on the row's outcome stripe for context.

const PR_COUNT = 24;
const SEED_BASE = 800_000;

function dateForIndex(i: number): string {
  const ms = Date.now() - (i * 30 * 24 * 60 * 60 * 1000) / PR_COUNT;
  return new Date(ms).toISOString().slice(0, 10);
}

export function HistoryTab() {
  const { isDark } = useTheme();
  const { t } = useTranslation('admission');
  const rules = useAdmissionStore((s) => s.rules);
  const repo = useFilterStore((s) => s.repo);

  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < PR_COUNT; i++) {
      const seed = SEED_BASE + i;
      const diff = simulateBranchDiff(repo, seed);
      const decision = evaluateAdmission(rules, repo, diff);
      out.push({
        seed,
        date: dateForIndex(i),
        filesChanged: diff.changes.length,
        ripple: diff.affected.length,
        decision,
      });
    }
    return out;
  }, [rules, repo]);

  const summary = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const r of rows) {
      if (r.decision.outcome === 'block') block++;
      else if (r.decision.outcome === 'warn') warn++;
      else pass++;
    }
    return { block, warn, pass };
  }, [rows]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="max-w-[960px] w-full mx-auto flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div
        className="shrink-0 px-8 py-3 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${tokens(isDark).border}` }}
      >
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--fg-strong)]">
          Retroactive simulation
        </h2>
        <span className={`text-[10px] font-mono ${isDark ? 'text-white/40' : 'text-black/55'}`}>
          {PR_COUNT} synthetic PRs · 30d window · current ruleset
        </span>
        <div className="flex-1" />
        <Counter dim={isDark} label="block" value={summary.block} color={SEVERITY_COLOR.block} />
        <Counter dim={isDark} label="warn" value={summary.warn} color={SEVERITY_COLOR.warn} />
        <Counter dim={isDark} label="pass" value={summary.pass} color="#5fa86c" />
      </div>

      {/* Timeline strip — one cell per PR, outcome is the only hue */}
      <div
        className="shrink-0 px-8 py-2"
        style={{ borderBottom: `1px solid ${tokens(isDark).border}` }}
      >
        <div className="flex items-stretch gap-px h-3 rounded-sm overflow-hidden">
          {rows.map((r) => (
            <div
              key={r.seed}
              title={`#${r.seed} · ${r.date} · ${r.decision.outcome.toUpperCase()}`}
              className="flex-1 transition-opacity hover:opacity-60"
              style={{
                backgroundColor:
                  r.decision.outcome === 'block' ? SEVERITY_COLOR.block :
                  r.decision.outcome === 'warn'  ? SEVERITY_COLOR.warn  :
                  '#5fa86c',
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-[color:var(--fg-subtle)]">
          <span>30d ago</span>
          <span>now</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-[11px]">
          <thead
            className="sticky top-0 z-10 backdrop-blur"
            style={{
              backgroundColor: isDark ? 'rgba(13,17,23,0.55)' : 'rgba(255,255,255,0.55)',
            }}
          >
            <tr className={`text-left text-[10px] font-mono uppercase tracking-[0.18em] border-b border-[color:var(--border-muted)] ${
              isDark ? 'text-white/40' : 'text-black/55'
            }`}>
              <th className="pl-8 pr-2 py-2 w-2" />
              <th className="px-2 py-2">PR</th>
              <th className="px-2 py-2">{t('table.date')}</th>
              <th className="px-2 py-2 text-right">{t('table.files')}</th>
              <th className="px-2 py-2 text-right">{t('table.ripple')}</th>
              <th className="px-2 py-2">{t('table.outcome')}</th>
              <th className="px-2 py-2 pr-8">{t('table.firedRules')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row key={r.seed} row={r} dim={isDark} />
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

function Row({
  row, dim,
}: {
  row: {
    seed: number;
    date: string;
    filesChanged: number;
    ripple: number;
    decision: ReturnType<typeof evaluateAdmission>;
  };
  dim: boolean;
}) {
  const outcomeColor =
    row.decision.outcome === 'block' ? SEVERITY_COLOR.block :
    row.decision.outcome === 'warn'  ? SEVERITY_COLOR.warn  :
    '#5fa86c';
  const fired = row.decision.ruleResults.filter((rr) => rr.status === 'block' || rr.status === 'warn');

  return (
    <tr className={`group border-b border-[color:var(--border-muted)] ${
      dim ? 'hover:bg-white/[0.025]' : 'hover:bg-black/[0.02]'
    }`}>
      {/* Outcome stripe */}
      <td className="pl-8 pr-0 py-2.5">
        <span
          className="block w-1 h-4 rounded-sm"
          style={{ backgroundColor: outcomeColor, opacity: 0.85 }}
        />
      </td>
      <td className="px-2 py-2.5 font-mono text-[color:var(--fg-strong)]">
        #{row.seed}
      </td>
      <td className="px-2 py-2.5 font-mono text-[10px] text-[color:var(--fg-muted)]">
        {row.date}
      </td>
      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-[color:var(--fg-default)]">
        {row.filesChanged}
      </td>
      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-[color:var(--fg-muted)]">
        {row.ripple}
      </td>
      <td className="px-2 py-2.5">
        <span
          className="text-[10px] font-mono uppercase tracking-[0.18em]"
          style={{ color: outcomeColor }}
        >
          {row.decision.outcome}
        </span>
      </td>
      <td className="px-2 py-2.5 pr-8">
        {fired.length === 0 ? (
          <span className="font-mono text-[10px] text-[color:var(--fg-subtle)]">—</span>
        ) : (
          <span className={`font-mono text-[10px] ${dim ? 'text-white/55' : 'text-black/70'}`}>
            {fired.slice(0, 3).map((rr) => `${SOURCE_GLYPH[rr.source]} ${rr.ruleName}`).join(' · ')}
            {fired.length > 3 && (
              <span className="text-[color:var(--fg-subtle)]"> · +{fired.length - 3}</span>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

function Counter({
  label, value, color, dim,
}: { label: string; value: number; color: string; dim: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className={`text-[9px] font-mono uppercase tracking-[0.18em] ${
        dim ? 'text-white/40' : 'text-black/55'
      }`}>
        {label}
      </span>
    </div>
  );
}
