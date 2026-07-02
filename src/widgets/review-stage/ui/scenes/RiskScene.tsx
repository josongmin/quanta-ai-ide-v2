import { useMemo } from 'react';
import {
  KeyRound, Play, ShieldAlert,
} from 'lucide-react';
import {
  computePrRisk,
  coverageDeltas,
  failedTestsRow,
  incidentMatches,
  type EngineSeverity,
  type IncidentMatch,
  type PullRequest,
  type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Badge, type BadgeVariant } from '@shared/ui/Badge';
import { testCoverageRatio } from '../../lib/sota';
import { V2Card } from '../ReviewSurface';

const TIER_VARIANT: Record<RiskTier, BadgeVariant> = {
  safe: 'success', attention: 'warn', critical: 'danger',
};

export function RiskScene({
  pr,
  repo,
  severityColors,
  tierColors,
  tierLabels,
}: {
  pr: PullRequest;
  repo: RepoData;
  severityColors: Record<EngineSeverity, string>;
  tierColors: Record<RiskTier, string>;
  tierLabels: Record<RiskTier, string>;
}) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const cov = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const tests = useMemo(() => failedTestsRow(pr), [pr]);
  const incidents = useMemo(() => incidentMatches(pr, repo), [pr, repo]);
  const testRatio = useMemo(() => testCoverageRatio(pr.files), [pr.files]);
  const accent = tierColors[risk.tier];

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-[var(--fg-muted)]" />
        <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          Risk profile
        </span>
        <Badge variant={TIER_VARIANT[risk.tier]} fill="soft" className="ml-auto gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
          {tierLabels[risk.tier]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <RiskStat label="Blast" value={String(risk.blastSum)} accent={risk.blastSum >= 25 ? severityColors.medium : null} />
        <RiskStat label="Public API" value={String(risk.publicApiCount)} accent={risk.publicApiCount > 0 ? severityColors.medium : null} />
        <RiskStat label="Low safety" value={String(risk.lowSafetyCount)} accent={risk.lowSafetyCount > 0 ? severityColors.medium : null} />
        <RiskStat label="SAST" value={String(risk.sastFindings)} accent={risk.sastFindings > 0 ? severityColors.blocker : null} />
        <RiskStat label="Coverage" value={risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`} accent={risk.avgCoverage !== null && risk.avgCoverage < 0.5 ? severityColors.medium : null} />
        <RiskStat label="Cyclic" value={String(risk.cyclicCount)} accent={risk.cyclicCount > 0 ? severityColors.medium : null} />
      </div>

      {risk.secretsRisk && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md text-[12px]"
          style={{ background: `color-mix(in srgb, ${severityColors.blocker} 10%, transparent)`, color: severityColors.blocker, border: `1px solid color-mix(in srgb, ${severityColors.blocker} 33%, transparent)` }}
        >
          <KeyRound className="w-3.5 h-3.5 shrink-0" />
          A changed file matched the secrets-likely heuristic. Treat with care.
        </div>
      )}

      {risk.reasons.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            Why this score
          </div>
          <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[var(--fg-default)]">
            {risk.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span style={{ color: accent }}>▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {cov.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            Coverage delta
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {cov.map((r) => {
              const dropPct = Math.min(100, Math.max(0, r.drop));
              return (
                <div key={r.filePath} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[11px] text-[var(--fg-default)]">{r.filePath}</div>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: `color-mix(in srgb, ${severityColors.blocker} 13%, transparent)` }}>
                      <div className="h-full" style={{ width: `${String(dropPct)}%`, background: severityColors.blocker }} />
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-[var(--fg-subtle)]">{r.before}%</span>
                    <span className="text-[var(--fg-subtle)]">→</span>
                    <span className="text-[var(--fg-strong)]">{r.after}%</span>
                    <span style={{ color: r.drop > 0 ? severityColors.blocker : 'var(--intent-success-fg)' }}>
                      {r.drop > 0 ? `-${String(r.drop)}pp` : `+${String(-r.drop)}pp`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {testRatio.total > 0 && (
        <div className="mt-4 text-[12px] text-[var(--fg-default)]">
          <span className="font-bold text-[var(--fg-strong)]">{Math.round(testRatio.ratio * 100)}%</span> of
          {' '}{testRatio.total} touched source {testRatio.total === 1 ? 'file has' : 'files have'} a co-changed test
          {testRatio.ratio < 0.5 && (
            <span className="ml-1.5" style={{ color: severityColors.medium }}>
              · consider adding tests before merge
            </span>
          )}
        </div>
      )}

      {incidents.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
              Past incident proximity
            </span>
            <span className="ml-auto text-[10px] font-mono text-[var(--fg-subtle)]">
              {incidents.length} prior {incidents.length === 1 ? 'match' : 'matches'}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {incidents.slice(0, 4).map((m) => <IncidentMatchRow key={m.id} m={m} mediumColor={severityColors.medium} />)}
          </ul>
        </div>
      )}

      {tests !== null && (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
              Failed tests
            </span>
            <span
              className="ml-auto inline-flex items-center px-2 h-5 rounded-full text-[10px] font-mono tabular-nums"
              style={{ background: 'var(--intent-success-bg)', color: 'var(--intent-success-fg)' }}
            >
              {tests.passed}/{tests.passed + tests.failed} passing
            </span>
          </div>
          {tests.failingNames.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {tests.failingNames.map((name) => (
                <li key={name} className="flex items-center justify-between gap-3 px-2 py-1 rounded-md bg-[var(--bg-surface-muted)]">
                  <span className="font-mono text-[11px] truncate text-[var(--fg-strong)]">{name}</span>
                  <button
                    type="button"
                    className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--fg-default)] hover:bg-[var(--bg-active)]"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </V2Card>
  );
}

function RiskStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string | null;
}) {
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: 'var(--bg-surface-muted)',
        border: `1px solid ${accent ?? 'var(--bg-active)'}`,
        boxShadow: 'none',
      }}
    >
      <div className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">{label}</div>
      <div
        className="mt-0.5 text-[18px] font-black tabular-nums leading-none"
        style={{ color: accent ?? 'var(--fg-strong)' }}
      >
        {value}
      </div>
    </div>
  );
}

function IncidentMatchRow({
  m,
  mediumColor,
}: {
  m: IncidentMatch;
  mediumColor: string;
}) {
  const pct = Math.round(m.similarity * 100);
  const fill = m.similarity >= 0.6 ? mediumColor
    : m.similarity >= 0.4 ? 'var(--fg-link)'
      : 'var(--fg-muted)';
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2 py-1.5 rounded-md bg-[var(--bg-surface-muted)]">
      <span className="font-mono text-[10px] text-[var(--fg-muted)] shrink-0">{m.id}</span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] text-[var(--fg-strong)]">{m.title}</span>
        <span className="block mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-active)' }}>
          <span className="block h-full" style={{ width: `${String(pct)}%`, background: fill }} />
        </span>
      </span>
      <span className="shrink-0 inline-flex items-center gap-2 text-[10px] font-mono tabular-nums">
        <span className="text-[var(--fg-subtle)]">{m.date}</span>
        <span style={{ color: fill }}>{pct}%</span>
      </span>
    </li>
  );
}
