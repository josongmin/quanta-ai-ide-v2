import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, GitBranch, Loader2,
  MessageSquare, MinusCircle, ShieldAlert, ShieldCheck, ShieldX, X,
} from 'lucide-react';
import { useTheme } from '@shared/theme/ThemeContext';
import {
  computePrRisk, coverageDeltas, engineFindings, engineSummary,
  summariseChecks, summariseConversation,
  type EngineSeverity,
  type PrStatus,
  type PullRequest,
  type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { useReviewStore, viewerLogin } from '@features/review-pr';
import {
  autoMergeReadiness, effortForPr, GATE_EXPLAINER, slaForPr, stackInfoForPr,
  type GateKey,
} from '../lib/insights2026';
import { releaseReadiness } from '../lib/sota';
import AuthorVelocity from './AuthorVelocity';
import { CopilotTake } from './ReviewCopilot';
import EffortMeter from './EffortMeter';
import FatigueMeter from './FatigueMeter';
import OutlierBadge from './OutlierBadge';
import ReleaseChip from './ReleaseChip';
import ReviewTimer from './ReviewTimer';
import SlaChip from './SlaChip';
import StackChip from './StackChip';
import { V2Card } from './ReviewSurface';

type SeverityColors = Record<EngineSeverity, string>;
type TierLabels = Record<RiskTier, string>;
type GateState = 'pass' | 'warn' | 'fail' | 'pending' | 'idle';

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
      : '#5fa86c';
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
        backdropFilter: 'blur(12px) saturate(160%)',
        WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        borderColor: `${accent}24`,
        boxShadow: `inset 0 -1px 0 0 ${accent}10`,
      }}
    >
      <span className="inline-flex items-center gap-2 shrink-0">
        <span
          aria-hidden
          className="inline-block w-2 h-2 rounded-sm"
          style={{ background: accent, boxShadow: `0 0 0 3px ${accent}1f` }}
        />
        <span
          className="text-[10.5px] font-black uppercase tracking-[0.2em]"
          style={{ color: accent }}
        >
          {verdictLabel}
        </span>
        <span className="text-[10px] font-mono text-white/30 tabular-nums">
          #{pr.number}
        </span>
      </span>

      <span aria-hidden className="hidden lg:block w-px h-4 bg-white/[0.08] shrink-0" />

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
            className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[9.5px] font-bold uppercase tracking-[0.18em]"
            style={{ background: `${severityColors.blocker}1c`, color: severityColors.blocker, border: `1px solid ${severityColors.blocker}55` }}
          >
            conflict
          </span>
        )}
      </div>

      <span aria-hidden className="w-px h-4 bg-white/[0.08] shrink-0" />
      <div className="shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canDecide}
          onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-40 hover:brightness-110"
          style={{
            background: 'rgba(79,154,92,0.16)',
            color: '#a4d4ad',
            border: '1px solid rgba(79,154,92,0.50)',
          }}
        >
          <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />
          Approve
        </button>
        <button
          type="button"
          disabled={!canDecide}
          onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-40 hover:brightness-110"
          style={{
            background: 'rgba(194,90,85,0.12)',
            color: '#eab1ad',
            border: '1px solid rgba(194,90,85,0.45)',
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
      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
        {label}
      </span>
    </span>
  );
}

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
      : '#5fa86c';
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
          background: `linear-gradient(90deg, ${accent}1a 0%, ${accent}08 18%, transparent 32%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${accent}cc 0%, ${accent}33 40%, transparent 100%)` }}
      />

      <div className="relative p-6 flex flex-col gap-5">
        <div className="flex items-start gap-5">
          <div
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              background: `${accent}1f`,
              border: `1px solid ${accent}5c`,
              boxShadow: `inset 0 0 0 1px ${accent}14, 0 6px 20px -8px ${accent}40`,
            }}
          >
            <Icon className="w-6 h-6" style={{ color: accent }} strokeWidth={2.25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 h-4">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/45">
                pull request
              </span>
              <span className="text-[9.5px] font-mono text-white/35 tabular-nums">
                #{pr.number}
              </span>
              <span className="w-px h-3 bg-white/[0.10]" />
              <PrStatusPill status={pr.status} />
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className="text-[28px] font-black uppercase tracking-[-0.01em] leading-[0.95]"
                style={{ color: accent }}
              >
                {verdictLabel}
              </span>
              <span
                className="text-[14px] font-semibold text-white/90 truncate max-w-[480px] leading-tight"
                title={pr.title}
              >
                {pr.title}
              </span>
            </div>
            <div className="text-[10.5px] font-mono text-white/40 mt-2 flex items-center gap-1.5">
              <GitBranch className="w-3 h-3" />
              <span className="text-white/55">{pr.baseBranch}</span>
              <span className="text-white/25">←</span>
              <span className="text-white/55">{pr.headBranch}</span>
              <span className="text-white/20 mx-1">·</span>
              <span>@{pr.author}</span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1.5 w-[168px]">
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'approve', 'Looks good!', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-10 rounded-lg text-[11.5px] font-bold uppercase tracking-[0.16em] text-white transition-all hover:brightness-115 active:brightness-95 disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, rgba(95,168,108,0.22) 0%, rgba(79,154,92,0.14) 100%)',
                border: '1px solid rgba(95,168,108,0.55)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              Approve
            </button>
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'request-changes', 'Please address findings.', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-9 rounded-lg text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 hover:text-white transition-colors disabled:opacity-40"
              style={{
                background: 'rgba(194,90,85,0.10)',
                border: '1px solid rgba(194,90,85,0.40)',
              }}
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
              Request changes
            </button>
            <button
              type="button"
              disabled={!canDecide}
              onClick={() => { submitReview(pr.number, 'comment', 'Comment.', viewerLogin); }}
              className="flex items-center justify-center gap-2 h-8 rounded-md text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white/85 hover:bg-white/[0.04] transition-colors disabled:opacity-40"
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
          <HeroStatCell label="auto-fix" value={summary.autoFix} color={summary.autoFix > 0 ? '#5a8fce' : undefined} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/35 shrink-0">
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
                background: 'rgba(149,131,184,0.10)',
                border: '1px solid rgba(149,131,184,0.35)',
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
        background: isLive ? `${color}0e` : 'var(--bg-surface-muted)',
      }}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40 leading-none">
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
    draft: { label: 'Draft', color: '#8b949e' },
    open: { label: 'Open', color: '#5fa86c' },
    'changes-requested': { label: 'Changes', color: '#c25a55' },
    approved: { label: 'Approved', color: '#5fa86c' },
    merged: { label: 'Merged', color: '#9583b8' },
    closed: { label: 'Closed', color: '#8b949e' },
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
  const { isDark } = useTheme();
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
        : s === 'pass' ? '#5fa86c'
          : s === 'pending' ? '#5a8fce'
            : '#8b949e';

  return (
    <V2Card className="px-4 py-3">
      <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
        <Activity className="w-3 h-3" />
        Merge pipeline
        {autoMerge.eligible && (
          <button
            type="button"
            onClick={() => { setAutoMergeArmed((v) => !v); }}
            aria-pressed={autoMergeArmed}
            className="ml-2 inline-flex items-center gap-1 px-2 h-5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em] transition-colors"
            style={{
              background: autoMergeArmed ? 'rgba(95,168,108,0.18)' : 'var(--bg-hover)',
              color: autoMergeArmed ? '#9ee2a4' : 'var(--fg-muted)',
              border: autoMergeArmed
                ? '1px solid rgba(95,168,108,0.55)'
                : '1px solid var(--border-strong)',
            }}
            title={autoMergeArmed
              ? 'Auto-merge armed — will merge when CI turns green'
              : 'Arm auto-merge so the PR ships the moment CI turns green'}
          >
            {autoMergeArmed ? '✓ auto-merge armed' : 'arm auto-merge'}
          </button>
        )}
        <span className="ml-auto text-[10px] font-mono text-white/40">
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
                  background: isDark
                    ? `linear-gradient(140deg, ${c}1a, ${c}06)`
                    : `linear-gradient(140deg, ${c}26, ${c}10)`,
                  border: `1px solid ${c}${isDark ? '40' : '66'}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <GateGlyph state={g.state} color={c} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
                    {g.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-mono tabular-nums truncate" style={{ color: c }}>
                  {g.detail}
                </div>
              </div>
              {i < gates.length - 1 && (
                <div className="shrink-0 w-3 flex items-center justify-center">
                  <span className="block w-2 h-px bg-white/15" />
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
