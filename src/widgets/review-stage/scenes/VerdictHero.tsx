// ─────────────────────────────────────────────────────────────────────────
// HERO — verdict aurora, big tier word, action stack.
//
// Why this is at the top of the spine: F-pattern scan lands here first;
// the big "READY / NEEDS REVIEW / BLOCKED" word + action stack means the
// reviewer can decide-without-scrolling on the easy cases.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import {
  CheckCircle2, GitBranch, MessageSquare,
  ShieldAlert, ShieldCheck, ShieldX, X,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary,
  summariseChecks, summariseConversation,
  type PrStatus, type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useReviewStore, viewerLogin } from '@features/review-pr';
import { OK, SEV } from '../lib/tones';
import V2Card from '../ui/V2Card';
import EffortMeter from '../ui/EffortMeter';
import StackChip from '../ui/StackChip';
import SlaChip from '../ui/SlaChip';
import {
  effortForPr, slaForPr, stackInfoForPr,
} from '../lib/insights2026';

export default function VerdictHero({
  pr, repo, allPrs,
}: { pr: PullRequest; repo: RepoData; allPrs: PullRequest[] }) {
  const risk = useMemo(() => computePrRisk(pr, repo), [pr, repo]);
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const verdict: 'ready' | 'review' | 'block' =
    summary.blocker > 0 || ci.required.failed > 0 || pr.hasConflicts
      ? 'block'
      : risk.tier === 'critical' || summary.high > 0
        ? 'review'
        : 'ready';
  const accent = verdict === 'block' ? SEV.blocker
    : verdict === 'review' ? SEV.medium
    : OK;
  const Icon = verdict === 'ready' ? ShieldCheck
    : verdict === 'review' ? ShieldAlert : ShieldX;
  const verdictLabel = verdict === 'ready' ? 'READY'
    : verdict === 'review' ? 'NEEDS REVIEW' : 'BLOCKED';

  const submitReview = useReviewStore((s) => s.submitReview);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const canDecide = myReviewer !== undefined && pr.status !== 'merged' && pr.status !== 'closed';

  // 2026 derived signals — computed at hero level so the meter, stack,
  // and SLA chip can sit alongside the verdict word without the queue
  // having to re-publish them. allPrs is required for stack detection.
  const effort = useMemo(() => effortForPr(pr), [pr]);
  const stack = useMemo(() => stackInfoForPr(pr, allPrs), [pr, allPrs]);
  const sla = useMemo(() => slaForPr(pr), [pr]);

  return (
    <V2Card className="relative overflow-hidden">
      {/* Subtle accent wash — static, no motion. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(60% 100% at 4% 50%, ${accent}24 0%, transparent 65%)`,
        }}
      />

      <div className="relative p-6 flex items-center gap-6">
        {/* Static plaque */}
        <div
          className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}55`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: accent }} />
        </div>

        {/* Headline */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
              pull request · #{pr.number}
            </span>
            <PrStatusPill status={pr.status} />
          </div>
          <div className="flex items-baseline gap-4 flex-wrap">
            <span
              className="text-[32px] font-black uppercase tracking-tight leading-none"
              style={{ color: accent }}
            >
              {verdictLabel}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white/85 truncate max-w-[520px]" title={pr.title}>
                {pr.title}
              </span>
              <span className="text-[10px] font-mono text-white/40 mt-0.5 flex items-center gap-1.5">
                <GitBranch className="w-3 h-3" />
                {pr.baseBranch} ← {pr.headBranch}
                <span className="text-white/30">·</span>
                @{pr.author}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <HeroStat label="blocker" value={summary.blocker} color={summary.blocker > 0 ? SEV.blocker : undefined} />
            <Sep />
            <HeroStat label="high"    value={summary.high}    color={summary.high > 0 ? SEV.high : undefined} />
            <Sep />
            <HeroStat label="ci fail" value={ci.required.failed} color={ci.required.failed > 0 ? SEV.blocker : undefined} />
            <Sep />
            <HeroStat label="threads" value={threads.length} color={threads.length > 0 ? SEV.medium : undefined} />
            <Sep />
            <HeroStat label="auto-fix" value={summary.autoFix} color={summary.autoFix > 0 ? SEV.low : undefined} />
          </div>

          {/* 2026 row — reviewer effort + DORA aging + stack position.
              These are decision-pacing signals (not severity), so they
              live below the severity counters and use a different
              visual register (subtle pills + meter rather than big
              numbers). */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <EffortMeter effort={effort} />
            {sla.bucket !== 'fresh' && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <SlaChip sla={sla} />
              </span>
            )}
            {stack.stackKey !== null && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-md"
                style={{
                  background: 'rgba(149,131,184,0.10)',
                  border: '1px solid rgba(149,131,184,0.35)',
                }}
              >
                <StackChip info={stack} />
              </span>
            )}
          </div>
        </div>

        {/* Action stack */}
        <div className="shrink-0 flex flex-col gap-2 min-w-[160px]">
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[rgba(79,154,92,0.18)] disabled:opacity-40"
            style={{
              background: 'rgba(79,154,92,0.12)',
              border: '1px solid rgba(79,154,92,0.45)',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white/85 hover:text-white transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(194,90,85,0.10)',
              border: '1px solid rgba(194,90,85,0.40)',
            }}
          >
            <X className="w-3 h-3" />
            Request changes
          </button>
          <button
            type="button"
            disabled={!canDecide}
            onClick={() => { submitReview(pr.number, 'comment', 'Comment.', viewerLogin); }}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] text-white/55 hover:text-white transition-colors disabled:opacity-40"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <MessageSquare className="w-3 h-3" />
            Comment
          </button>
        </div>
      </div>
    </V2Card>
  );
}

function PrStatusPill({ status }: { status: PrStatus }) {
  const map: Record<PrStatus, { label: string; color: string }> = {
    draft:               { label: 'Draft',     color: '#8b949e' },
    open:                { label: 'Open',      color: OK },
    'changes-requested': { label: 'Changes',   color: SEV.blocker },
    approved:            { label: 'Approved',  color: OK },
    merged:              { label: 'Merged',    color: '#9583b8' },
    closed:              { label: 'Closed',    color: '#8b949e' },
  };
  const m = map[status];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${m.color}22`, color: m.color }}
    >
      {m.label}
    </span>
  );
}

function HeroStat({
  label, value, color,
}: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[22px] font-black tabular-nums leading-none"
        style={{ color: color ?? 'rgba(255,255,255,0.85)' }}
      >
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function Sep() { return <span className="w-px h-6 bg-white/10" />; }
