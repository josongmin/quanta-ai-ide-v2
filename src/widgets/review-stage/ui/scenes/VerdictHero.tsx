import { useMemo } from 'react';
import {
  CheckCircle2, GitBranch, MessageSquare, ShieldAlert, ShieldCheck, ShieldX, X,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary,
  summariseChecks, summariseConversation,
  type EngineSeverity,
  type PrStatus,
  type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useReviewStore, viewerLogin } from '@features/review-pr';
import {
  effortForPr, slaForPr, stackInfoForPr,
} from '../../lib/insights2026';
import { releaseReadiness } from '../../lib/sota';
import EffortMeter from '../EffortMeter';
import ReleaseChip from '../ReleaseChip';
import ReviewTimer from '../ReviewTimer';
import SlaChip from '../SlaChip';
import StackChip from '../StackChip';
import { V2Card } from '../ReviewSurface';

type SeverityColors = Record<EngineSeverity, string>;

export function VerdictHero({
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
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const effort = useMemo(() => effortForPr(pr), [pr]);
  const sla = useMemo(() => slaForPr(pr), [pr]);
  const stack = useMemo(() => stackInfoForPr(pr, allPrs), [pr, allPrs]);
  const release = useMemo(() => releaseReadiness(pr), [pr]);

  const verdict: 'ready' | 'review' | 'block' =
    summary.blocker > 0 || ci.required.failed > 0 || pr.hasConflicts
      ? 'block'
      : risk.tier === 'critical' || summary.high > 0
        ? 'review'
        : 'ready';
  const accent = verdict === 'block' ? severityColors.blocker
    : verdict === 'review' ? severityColors.medium
      : 'var(--intent-success-fg)';
  const Icon = verdict === 'ready' ? ShieldCheck
    : verdict === 'review' ? ShieldAlert : ShieldX;
  const verdictLabel = verdict === 'ready' ? 'READY'
    : verdict === 'review' ? 'NEEDS REVIEW' : 'BLOCKED';

  const submitReview = useReviewStore((s) => s.submitReview);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const canDecide = myReviewer !== undefined && pr.status !== 'merged' && pr.status !== 'closed';

  return (
    <V2Card className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 10%, transparent) 0%, color-mix(in srgb, ${accent} 3%, transparent) 18%, transparent 32%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 80%, transparent) 0%, color-mix(in srgb, ${accent} 20%, transparent) 40%, transparent 100%)` }}
      />

      <div className="relative p-6 flex flex-col gap-5">
        <div className="flex items-start gap-5">
          <div
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${accent} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 36%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 8%, transparent), 0 6px 20px -8px color-mix(in srgb, ${accent} 25%, transparent)`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: accent }} strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 h-4">
              <span className="text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
                pull request
              </span>
              <span className="text-xs font-mono text-[var(--fg-subtle)] tabular-nums">
                #{pr.number}
              </span>
              <span className="w-px h-3 bg-[var(--border-default)]" />
              <PrStatusPill status={pr.status} />
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className="text-4xl font-black uppercase tracking-[-0.01em] leading-[0.95]"
                style={{ color: accent }}
              >
                {verdictLabel}
              </span>
              <span
                className="text-lg font-semibold text-[var(--fg-strong)] truncate max-w-[480px] leading-tight"
                title={pr.title}
              >
                {pr.title}
              </span>
            </div>
            <div className="text-sm font-mono text-[var(--fg-subtle)] mt-2 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              <span className="text-[var(--fg-muted)]">{pr.baseBranch}</span>
              <span className="text-[var(--fg-subtle)]">←</span>
              <span className="text-[var(--fg-muted)]">{pr.headBranch}</span>
              <span className="text-[var(--fg-subtle)] mx-1">·</span>
              <span>@{pr.author}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1.5 w-[168px]">
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-10 rounded-lg text-base font-bold uppercase tracking-eyebrow text-[var(--fg-strong)] transition-all hover:brightness-115 active:brightness-95 disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--intent-success-fg) 22%, transparent) 0%, color-mix(in srgb, var(--intent-success-fg) 14%, transparent) 100%)',
                border: '1px solid color-mix(in srgb, var(--intent-success-fg) 55%, transparent)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              Approve
            </button>
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-bold uppercase tracking-eyebrow text-[var(--fg-strong)] hover:text-[var(--fg-strong)] transition-colors disabled:opacity-40"
              style={{
                background: 'var(--intent-danger-bg)',
                border: '1px solid color-mix(in srgb, var(--intent-danger-fg) 40%, transparent)',
              }}
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
              Request changes
            </button>
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'comment', 'Comment.', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-8 rounded-md text-sm font-semibold uppercase tracking-eyebrow text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40"
            >
              <MessageSquare className="w-3 h-3" strokeWidth={2.25} />
              Comment
            </button>
          </div>
        </div>

        <div
          className="grid gap-px rounded-lg overflow-hidden"
          style={{
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            background: 'var(--bg-active)',
            border: '1px solid var(--border-default)',
          }}
        >
          <HeroStatCell label="blocker" value={summary.blocker} color={summary.blocker > 0 ? severityColors.blocker : undefined} />
          <HeroStatCell label="high" value={summary.high} color={summary.high > 0 ? severityColors.high : undefined} />
          <HeroStatCell label="ci fail" value={ci.required.failed} color={ci.required.failed > 0 ? severityColors.blocker : undefined} />
          <HeroStatCell label="threads" value={threads.length} color={threads.length > 0 ? severityColors.medium : undefined} />
          <HeroStatCell label="auto-fix" value={summary.autoFix} color={summary.autoFix > 0 ? 'var(--intent-info-fg)' : undefined} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-subtle)] shrink-0">
            pace
          </span>
          <EffortMeter effort={effort} />
          <ReviewTimer prNumber={pr.number} />
          {sla.bucket !== 'fresh' && (
            <span
              className="inline-flex items-center px-2.5 h-7 rounded-md"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-default)',
              }}
            >
              <SlaChip sla={sla} />
            </span>
          )}
          {stack.stackKey !== null && (
            <span
              className="inline-flex items-center px-2.5 h-7 rounded-md"
              style={{
                background: 'color-mix(in srgb, var(--fg-accent) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--fg-accent) 35%, transparent)',
              }}
            >
              <StackChip info={stack} />
            </span>
          )}
          <ReleaseChip readiness={release} />
        </div>
      </div>
    </V2Card>
  );
}

function HeroStatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const isLive = color !== undefined;
  return (
    <div
      className="flex flex-col gap-1 px-3 py-2.5"
      style={{
        background: isLive ? `color-mix(in srgb, ${color} 6%, transparent)` : 'var(--bg-surface-muted)',
      }}
    >
      <span className="text-2xs font-bold uppercase tracking-eyebrow text-[var(--fg-subtle)] leading-none">
        {label}
      </span>
      <span
        className="text-[20px] font-black tabular-nums leading-none"
        style={{ color: color ?? 'var(--fg-strong)' }}
      >
        {value}
      </span>
    </div>
  );
}

function PrStatusPill({ status }: { status: PrStatus }) {
  const map: Record<PrStatus, { label: string; color: string }> = {
    draft: { label: 'Draft', color: 'var(--fg-muted)' },
    open: { label: 'Open', color: 'var(--intent-success-fg)' },
    'changes-requested': { label: 'Changes', color: 'var(--intent-danger-fg)' },
    approved: { label: 'Approved', color: 'var(--intent-success-fg)' },
    merged: { label: 'Merged', color: 'var(--fg-accent)' },
    closed: { label: 'Closed', color: 'var(--fg-muted)' },
  };
  const m = map[status];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-2xs font-bold uppercase tracking-eyebrow"
      style={{ background: `color-mix(in srgb, ${m.color} 13%, transparent)`, color: m.color }}
    >
      {m.label}
    </span>
  );
}
