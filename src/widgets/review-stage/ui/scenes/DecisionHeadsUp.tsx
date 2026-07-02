import { useMemo } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useTheme } from '@shared/theme/ThemeContext';
import {
  computePrRisk, coverageDeltas, engineFindings, engineSummary,
  summariseChecks,
  type EngineSeverity,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useReviewStore, viewerLogin } from '@features/review-pr';
import AuthorVelocity from '../AuthorVelocity';
import { CopilotTake } from '../ReviewCopilot';
import FatigueMeter from '../FatigueMeter';
import OutlierBadge from '../OutlierBadge';

type SeverityColors = Record<EngineSeverity, string>;

export function DecisionHeadsUp({
  pr,
  repo,
  allPrs,
  severityColors,
}: {
  pr: PullRequest;
  repo: RepoData;
  allPrs: PullRequest[];
  severityColors: SeverityColors;
}) {
  const { isDark } = useTheme();
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const cov = useMemo(() => coverageDeltas(pr, repo), [pr, repo]);
  const worstCovDrop = cov.reduce((m, r) => Math.max(m, r.drop), 0);
  const blast = useMemo(() => {
    let n = 0;
    for (const f of pr.files) {
      if (f.fileId === null) continue;
      const file = repo.files[f.fileId];
      if (!file) continue;
      n += file.deps.length;
    }
    return n;
  }, [pr, repo]);

  const verdict: 'ready' | 'review' | 'block' =
    summary.blocker > 0 || ci.required.failed > 0 || pr.hasConflicts
      ? 'block'
      : risk.tier === 'critical' || summary.high > 0
        ? 'review'
        : 'ready';
  const accent = verdict === 'block' ? severityColors.blocker
    : verdict === 'review' ? severityColors.medium
      : 'var(--intent-success-fg)';
  const verdictLabel = verdict === 'ready' ? 'READY'
    : verdict === 'review' ? 'REVIEW' : 'BLOCKED';

  const submitReview = useReviewStore((s) => s.submitReview);
  const jumpToPr = useReviewStore((s) => s.setActivePr);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const canDecide = myReviewer !== undefined && pr.status !== 'merged' && pr.status !== 'closed';

  const criticalSignals: { label: string; value: number; tone: string; unit?: string }[] = [];
  if (summary.blocker > 0) criticalSignals.push({ label: 'block', value: summary.blocker, tone: severityColors.blocker });
  if (ci.required.failed > 0) criticalSignals.push({ label: 'ci✕', value: ci.required.failed, tone: severityColors.blocker });
  if (summary.high > 0) criticalSignals.push({ label: 'high', value: summary.high, tone: severityColors.high });
  if (worstCovDrop >= 5) {
    criticalSignals.push({
      label: 'cov↓',
      value: Math.round(worstCovDrop),
      tone: worstCovDrop >= 10 ? severityColors.high : severityColors.medium,
      unit: 'pp',
    });
  }
  if (blast >= 12) criticalSignals.push({ label: 'blast', value: blast, tone: severityColors.medium });

  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3 px-6 h-11 border-b"
      style={{
        background: 'var(--bg-overlay)',
        ...(isDark ? {
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        } : {}),
        borderColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
        boxShadow: `inset 0 -1px 0 0 color-mix(in srgb, ${accent} 6%, transparent)`,
      }}
    >
      <span className="inline-flex items-center gap-2 shrink-0">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-sm"
          style={{ background: accent, boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 12%, transparent)` }}
        />
        <span
          className="text-sm font-black uppercase tracking-[var(--track-widest)]"
          style={{ color: accent }}
        >
          {verdictLabel}
        </span>
        <span className="text-[10px] font-mono text-[var(--fg-subtle)] tabular-nums">
          #{pr.number}
        </span>
      </span>

      <span aria-hidden className="hidden lg:block w-px h-4 bg-[var(--border-default)] shrink-0" />

      <span className="hidden xl:inline-flex items-center gap-2 min-w-0 shrink">
        <CopilotTake pr={pr} repo={repo} />
      </span>
      <span className="hidden lg:inline-flex shrink-0">
        <FatigueMeter pr={pr} />
      </span>
      <span className="hidden xl:inline-flex shrink-0">
        <OutlierBadge pr={pr} allPrs={allPrs} onJumpToPr={jumpToPr} />
      </span>
      <span className="hidden xl:inline-flex shrink-0">
        <AuthorVelocity pr={pr} allPrs={allPrs} />
      </span>

      <div className="flex items-center gap-3 ml-auto min-w-0 overflow-hidden justify-end">
        {criticalSignals.map((s) => (
          <HeadsUpStat key={s.label} label={s.label} value={s.value} color={s.tone} unit={s.unit} />
        ))}
        {pr.hasConflicts && (
          <span
            className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-xs font-bold uppercase tracking-[var(--track-eyebrow)]"
            style={{ background: `color-mix(in srgb, ${severityColors.blocker} 11%, transparent)`, color: severityColors.blocker, border: `1px solid color-mix(in srgb, ${severityColors.blocker} 33%, transparent)` }}
          >
            conflict
          </span>
        )}
      </div>

      <span aria-hidden className="w-px h-4 bg-[var(--border-default)] shrink-0" />
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canDecide}
          onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-40 hover:brightness-110"
          style={{
            background: 'var(--intent-success-bg)',
            color: 'var(--intent-success-fg)',
            border: '1px solid color-mix(in srgb, var(--intent-success-fg) 50%, transparent)',
          }}
        >
          <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
          Approve
        </button>
        <button
          type="button"
          disabled={!canDecide}
          onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-sm font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-40 hover:brightness-110"
          style={{
            background: 'var(--intent-danger-bg)',
            color: 'var(--intent-danger-fg)',
            border: '1px solid color-mix(in srgb, var(--intent-danger-fg) 45%, transparent)',
          }}
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
          Request
        </button>
      </div>
    </div>
  );
}

function HeadsUpStat({
  label,
  value,
  color,
  unit,
}: {
  label: string;
  value: number;
  color?: string;
  unit?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 shrink-0">
      <span
        className="text-[12px] font-bold tabular-nums leading-none"
        style={{ color: color ?? 'var(--fg-default)' }}
      >
        {value}{unit ?? ''}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
        {label}
      </span>
    </span>
  );
}
