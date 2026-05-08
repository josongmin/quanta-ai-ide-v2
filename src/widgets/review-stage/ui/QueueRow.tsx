// ─────────────────────────────────────────────────────────────────────────
// One row in the left queue rail. Three rows of meta in a single button:
//   1. Title + #number — primary scan target
//   2. Time / +/- diff / CI band / your reviewer state
//   3. Tier + risk signals (only when meaningful)
// ─────────────────────────────────────────────────────────────────────────

import { Check, Clock, MessageSquare, X, type LucideIcon } from 'lucide-react';
import {
  summariseChecks,
  type computePrRisk,
  type PrStatus, type PullRequest, type ReviewerState,
} from '@entities/pr';
import { viewerLogin } from '@features/review-pr';
import { SEV, TIER_COLOR, TIER_LABEL, OK } from '../lib/tones';
import { timeAgo } from '../lib/format';

const STATUS_DOT_BG: Record<PrStatus, string> = {
  draft: 'bg-zinc-400',
  open: 'bg-emerald-500',
  'changes-requested': 'bg-rose-400',
  approved: 'bg-emerald-400',
  merged: 'bg-violet-500',
  closed: 'bg-zinc-500',
};

function PrStatusDot({ status }: { status: PrStatus }) {
  return <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_BG[status]}`} />;
}

function CiStripe({ ci }: { ci: ReturnType<typeof summariseChecks> }) {
  const total = ci.required.passed + ci.required.failed + ci.required.pending;
  if (total === 0) return null;
  const segs = [
    { key: 'p', w: ci.required.passed,  bg: OK },
    { key: 'r', w: ci.required.pending, bg: SEV.medium },
    { key: 'f', w: ci.required.failed,  bg: SEV.blocker },
  ].filter((s) => s.w > 0);
  return (
    <span
      title={`CI: ${String(ci.required.passed)}✓ ${String(ci.required.pending)}⏱ ${String(ci.required.failed)}✕`}
      className="inline-flex h-1.5 w-8 rounded-sm overflow-hidden bg-white/5"
    >
      {segs.map((s) => (
        <span key={s.key} style={{ background: s.bg, flexGrow: s.w }} className="h-full" />
      ))}
    </span>
  );
}

const REVIEWER_GLYPH: Record<ReviewerState, { Icon: LucideIcon; color: string }> = {
  pending:             { Icon: Clock,         color: '#8b949e' },
  approved:            { Icon: Check,         color: OK },
  'changes-requested': { Icon: X,             color: SEV.blocker },
  commented:           { Icon: MessageSquare, color: '#8b949e' },
};

function ReviewerStateGlyph({ state, mine = false }: { state: ReviewerState; mine?: boolean }) {
  const meta = REVIEWER_GLYPH[state];
  return (
    <span
      title={mine ? `You: ${state}` : state}
      className="inline-flex items-center justify-center"
      style={{ color: meta.color }}
    >
      <meta.Icon className="w-3 h-3" />
    </span>
  );
}

export default function QueueRow({
  pr, risk, active, onClick,
}: {
  pr: PullRequest;
  risk: ReturnType<typeof computePrRisk>;
  active: boolean;
  onClick: () => void;
}) {
  const ci = summariseChecks(pr.checks);
  const myReviewer = pr.reviewers.find((r) => r.login === viewerLogin);
  const accent = TIER_COLOR[risk.tier];

  return (
    <button type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 transition-colors relative ${
        active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
      }`}
    >
      {/* Active state carried by the row surface tint and bolder title;
          risk accent surfaces inside the row via PrStatusDot — no
          left-edge stripe (project-wide convention). */}
      <div className="flex items-start gap-2.5">
        <PrStatusDot status={pr.status} />
        <div className="flex-1 min-w-0">
          {/* Row 1: title + number — primary scan target */}
          <div className="flex items-baseline gap-2">
            <div className={`flex-1 min-w-0 text-[12.5px] font-semibold leading-snug truncate ${
              active ? 'text-white' : 'text-white/85'
            }`}>
              {pr.title}
            </div>
            <span className="text-[10px] font-mono shrink-0 text-white/35">
              #{pr.number}
            </span>
          </div>

          {/* Row 2: meta — time, diff, CI. Single muted register. */}
          <div className="mt-1 flex items-center gap-2.5 text-[10.5px] text-white/50">
            <span className="font-mono tabular-nums">{timeAgo(pr.updatedAt)}</span>
            <span className="font-mono tabular-nums">
              <span className="text-emerald-400/80">+{pr.added}</span>
              <span className="text-white/25 mx-0.5">·</span>
              <span className="text-rose-400/80">−{pr.removed}</span>
            </span>
            <CiStripe ci={ci} />
            {myReviewer && <ReviewerStateGlyph state={myReviewer.state} mine />}
          </div>

          {/* Row 3: tier + risk signals — only present when meaningful */}
          {(risk.tier !== 'safe' || risk.blastSum > 0 || risk.sastFindings > 0) && (
            <div className="mt-1.5 flex items-center gap-2 text-[10px]">
              <span
                className="inline-flex items-center gap-1 font-semibold tracking-tight"
                style={{ color: accent }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: accent }} />
                {TIER_LABEL[risk.tier]}
              </span>
              {risk.blastSum > 0 && (
                <span className="font-mono tabular-nums text-white/40">
                  blast {risk.blastSum}
                </span>
              )}
              {risk.sastFindings > 0 && (
                <span className="font-mono tabular-nums" style={{ color: SEV.blocker }}>
                  sast {risk.sastFindings}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
