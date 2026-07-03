import { useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Loader2, MinusCircle, X,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary,
  summariseChecks,
  type EngineSeverity,
  type PullRequest,
  type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import {
  autoMergeReadiness, GATE_EXPLAINER,
  type GateKey,
} from '../../lib/insights2026';
import { V2Card } from '../ReviewSurface';

type SeverityColors = Record<EngineSeverity, string>;
type TierLabels = Record<RiskTier, string>;
type GateState = 'pass' | 'warn' | 'fail' | 'pending' | 'idle';

export function DecisionPipeline({
  pr,
  repo,
  severityColors,
  tierLabels,
}: {
  pr: PullRequest;
  repo: RepoData;
  severityColors: SeverityColors;
  tierLabels: TierLabels;
}) {
  const ci = summariseChecks(pr.checks);
  const findings = engineFindings(pr, repo);
  const summary = engineSummary(findings);
  const risk = computePrRisk(pr, repo);
  const reviewersDone = pr.reviewers.length > 0
    && pr.reviewers.every((r) => r.state === 'approved' || r.state === 'commented');
  const autoMerge = autoMergeReadiness(pr);
  const [autoMergeArmed, setAutoMergeArmed] = useState(false);

  const gates: { key: GateKey; label: string; state: GateState; detail: string }[] = [
    {
      key: 'lint',
      label: 'Lint',
      state: ci.required.failed > 0 ? 'fail' : ci.required.pending > 0 ? 'pending' : 'pass',
      detail: `${String(ci.required.passed)}✓ / ${String(ci.required.failed)}✕`,
    },
    {
      key: 'sast',
      label: 'SAST',
      state: summary.blocker > 0 ? 'fail' : summary.high > 0 ? 'warn' : 'pass',
      detail: summary.blocker > 0 ? `${String(summary.blocker)} blocker` : `${String(findings.length)} finding`,
    },
    {
      key: 'risk',
      label: 'Risk',
      state: risk.tier === 'critical' ? 'fail' : risk.tier === 'attention' ? 'warn' : 'pass',
      detail: tierLabels[risk.tier],
    },
    {
      key: 'cov',
      label: 'Coverage',
      state: risk.avgCoverage === null ? 'idle'
        : risk.avgCoverage >= 0.7 ? 'pass'
          : risk.avgCoverage >= 0.5 ? 'warn'
            : 'fail',
      detail: risk.avgCoverage === null ? '—' : `${String(Math.round(risk.avgCoverage * 100))}%`,
    },
    {
      key: 'review',
      label: 'Reviewers',
      state: reviewersDone ? 'pass' : pr.reviewers.length === 0 ? 'idle' : 'pending',
      detail: `${String(pr.reviewers.filter((r) => r.state === 'approved').length)}/${String(pr.reviewers.length)}`,
    },
    {
      key: 'merge',
      label: 'Mergeable',
      state: pr.hasConflicts ? 'fail' : 'pass',
      detail: pr.hasConflicts ? 'conflicts' : `${String(pr.ahead)}↑${String(pr.behind)}↓`,
    },
  ];

  const stateColor = (s: GateState): string =>
    s === 'fail' ? severityColors.blocker
      : s === 'warn' ? severityColors.medium
        : s === 'pass' ? 'var(--intent-success-fg)'
          : s === 'pending' ? 'var(--intent-info-fg)'
            : 'var(--fg-muted)';

  return (
    <V2Card className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
        <Activity className="w-3 h-3" />
        Merge pipeline
        {autoMerge.eligible && (
          <button
            type="button"
            onClick={() => { setAutoMergeArmed((v) => !v); }}
            aria-pressed={autoMergeArmed}
            className="ml-2 inline-flex items-center gap-1 px-2 h-5 rounded-full text-2xs font-bold uppercase tracking-eyebrow transition-colors"
            style={{
              background: autoMergeArmed ? 'color-mix(in srgb, var(--intent-success-fg) 18%, transparent)' : 'var(--bg-hover)',
              color: autoMergeArmed ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
              border: autoMergeArmed
                ? '1px solid color-mix(in srgb, var(--intent-success-fg) 55%, transparent)'
                : '1px solid var(--border-strong)',
            }}
            title={autoMergeArmed
              ? 'Auto-merge armed — will merge when CI turns green'
              : 'Arm auto-merge so the PR ships the moment CI turns green'}
          >
            {autoMergeArmed ? '✓ auto-merge armed' : 'arm auto-merge'}
          </button>
        )}
        <span className="ml-auto text-xs font-mono text-[var(--fg-subtle)]">
          {gates.filter((g) => g.state === 'pass').length}/{gates.length} gates clear
        </span>
      </div>
      <div className="flex items-stretch gap-0">
        {gates.map((g, i) => {
          const c = stateColor(g.state);
          const explainer = `${g.label} — ${GATE_EXPLAINER[g.key]}`;
          return (
            <div key={g.key} className="flex items-center flex-1 min-w-0">
              <div
                className="flex-1 min-w-0 rounded-lg px-2.5 py-2 relative overflow-hidden cursor-help"
                title={explainer}
                aria-label={explainer}
                style={{
                  background: `linear-gradient(140deg, color-mix(in srgb, ${c} 12%, transparent), color-mix(in srgb, ${c} 4%, transparent))`,
                  border: `1px solid color-mix(in srgb, ${c} 30%, transparent)`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <GateGlyph state={g.state} color={c} />
                  <span className="text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-strong)]">
                    {g.label}
                  </span>
                </div>
                <div className="mt-0.5 text-xs font-mono tabular-nums truncate" style={{ color: c }}>
                  {g.detail}
                </div>
              </div>
              {i < gates.length - 1 && (
                <div className="shrink-0 w-3 flex items-center justify-center">
                  <span className="block w-2 h-px bg-[var(--border-strong)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </V2Card>
  );
}

function GateGlyph({ state, color }: { state: GateState; color: string }) {
  if (state === 'pass') return <CheckCircle2 className="w-3 h-3" style={{ color }} />;
  if (state === 'fail') return <X className="w-3 h-3" style={{ color }} />;
  if (state === 'warn') return <AlertTriangle className="w-3 h-3" style={{ color }} />;
  if (state === 'pending') return <Loader2 className="w-3 h-3 animate-spin" style={{ color }} />;
  return <MinusCircle className="w-3 h-3" style={{ color }} />;
}
