// ─────────────────────────────────────────────────────────────────────────
// RIGHT RAIL — context (participants, branch, merge actions, jumps)
//
// The center spine is one long scroll, so the rail's "Jump to" panel
// replaces the old tab strip — clicking a jump scrolls to the section
// anchor instead of swapping panes.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, Bot, ChevronRight, FileCode,
  GitBranch, GitMerge, MessageSquare, Repeat, ShieldAlert,
  Squircle, type LucideIcon,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary,
  summariseChecks, summariseConversation,
  type PullRequest, type ReviewerState,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Avatar, useReviewStore } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';
import type { ReviewTabKey } from '../ReviewStage';
import { OK, SEV, TIER_COLOR } from '../lib/tones';

export default function ContextRail({
  pr, repo, onJump,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJump: (t: ReviewTabKey) => void;
}) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const jumps: { key: ReviewTabKey; label: string; count: number; tone: string; Icon: LucideIcon }[] = [
    { key: 'insights', label: 'Findings',      count: findings.length, tone: summary.blocker > 0 ? SEV.blocker : summary.high > 0 ? SEV.high : '#8b949e', Icon: Bot },
    { key: 'risk',     label: 'Risk profile',  count: 0, tone: TIER_COLOR[computePrRisk(pr, repo).tier], Icon: ShieldAlert },
    { key: 'files',    label: 'Files',         count: pr.files.length, tone: '#8b949e', Icon: FileCode },
    { key: 'checks',   label: 'CI checks',     count: ci.required.failed, tone: ci.required.failed > 0 ? SEV.blocker : '#8b949e', Icon: Activity },
    { key: 'activity', label: 'Threads',       count: threads.length, tone: threads.length > 0 ? SEV.medium : '#8b949e', Icon: MessageSquare },
  ];

  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          PR context
        </span>
        <span className="ml-auto text-[10px] font-mono text-white/40">#{pr.number}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
        {/* Quick jumps (replaces the old tab strip) */}
        <Section label="Jump to">
          <div className="grid grid-cols-1 gap-1">
            {jumps.map((j) => (
              <button
                key={j.key}
                type="button"
                onClick={() => { onJump(j.key); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors text-left"
              >
                <j.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: j.tone }} />
                <span className="flex-1 text-[12px] text-white/70">{j.label}</span>
                {j.count > 0 && (
                  <span
                    className="text-[10px] font-mono tabular-nums px-1.5 rounded-full"
                    style={{ background: `${j.tone}22`, color: j.tone }}
                  >
                    {j.count}
                  </span>
                )}
                <ChevronRight className="w-3 h-3 text-white/30" />
              </button>
            ))}
          </div>
        </Section>

        <ParticipantsSection pr={pr} />
        <BranchSection pr={pr} />
        <MergeActionsSection pr={pr} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] text-[10px] font-mono text-white/30">
        @{pr.author} · #{pr.number}
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ParticipantsSection({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  return (
    <Section label="Participants">
      <Participant login={pr.author} role="author" />
      {pr.reviewers.map((r) => (
        <Participant key={r.login} login={r.login} role="reviewer" state={r.state} />
      ))}
      {pr.reviewers.length === 0 && (
        <div className="text-[11px] text-white/40">{t('empty.noReviewers')}</div>
      )}
    </Section>
  );
}

function Participant({
  login, role, state,
}: { login: string; role: 'author' | 'reviewer'; state?: ReviewerState }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar login={login} size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate text-white/85">@{login}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">{role}</div>
      </div>
      {state !== undefined && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{
            background: `${state === 'approved' ? OK : state === 'changes-requested' ? SEV.blocker : '#8b949e'}22`,
            color: state === 'approved' ? OK : state === 'changes-requested' ? SEV.blocker : '#8b949e',
          }}
        >
          {state === 'changes-requested' ? 'Changes' : state}
        </span>
      )}
    </div>
  );
}

function BranchSection({ pr }: { pr: PullRequest }) {
  const { t } = useTranslation('review');
  return (
    <Section label="Branch">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/85">
        <GitBranch className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{pr.baseBranch}</span>
        <span className="text-white/40">←</span>
        <span className="truncate">{pr.headBranch}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/40">{t('merge.aheadBehind')}</span>
        <span className="text-[11px] font-mono tabular-nums">
          <span className="text-emerald-500">+{pr.ahead}</span>
          <span className="text-white/40"> / </span>
          <span className="text-rose-500">−{pr.behind}</span>
        </span>
      </div>
      {pr.hasConflicts && (
        <div
          className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md text-[11px]"
          style={{ background: `${SEV.blocker}1a`, color: SEV.blocker, border: `1px solid ${SEV.blocker}55` }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{t('merge.conflictsPresent')}</span>
        </div>
      )}
    </Section>
  );
}

function MergeActionsSection({ pr }: { pr: PullRequest }) {
  const mergePr = useReviewStore((s) => s.mergePr);
  const block = mergeBlocker(pr);
  const enabled = block === null;
  const buttons: { key: 'merge' | 'squash' | 'rebase'; label: string; Icon: LucideIcon }[] = [
    { key: 'merge',  label: 'Merge',  Icon: GitMerge },
    { key: 'squash', label: 'Squash', Icon: Squircle },
    { key: 'rebase', label: 'Rebase', Icon: Repeat },
  ];

  return (
    <Section label="Merge">
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            disabled={!enabled}
            onClick={() => { mergePr(pr.number, b.key); }}
            className="inline-flex items-center justify-center gap-1 h-8 rounded-md text-[11px] font-bold transition-colors disabled:cursor-not-allowed"
            style={{
              background: enabled
                ? 'linear-gradient(140deg, rgba(79,154,92,0.22), rgba(79,154,92,0.06))'
                : 'rgba(255,255,255,0.04)',
              color: enabled ? '#9ee2a4' : 'rgba(255,255,255,0.30)',
              border: enabled ? '1px solid rgba(79,154,92,0.45)' : '1px solid rgba(255,255,255,0.06)',
            }}
            title={block ?? `${b.label} into ${pr.baseBranch}`}
          >
            <b.Icon className="w-3 h-3" />
            {b.label}
          </button>
        ))}
      </div>
      {block !== null && (
        <div className="mt-1 text-[11px] text-white/55">
          Blocked because {block}.
        </div>
      )}
    </Section>
  );
}

function mergeBlocker(pr: PullRequest): string | null {
  if (pr.status === 'merged') return 'this PR is already merged';
  if (pr.status === 'closed') return 'this PR is closed';
  if (pr.hasConflicts)        return 'the branch has unresolved conflicts';
  const blockingChecks = pr.checks.filter((c) => c.required && (
    c.status === 'failure' || c.status === 'cancelled' || c.status === 'pending' || c.status === 'running'
  ));
  if (blockingChecks.length > 0) {
    const names = blockingChecks.slice(0, 2).map((c) => c.name).join(', ');
    const more = blockingChecks.length > 2 ? ` (+${String(blockingChecks.length - 2)} more)` : '';
    return `required check${blockingChecks.length > 1 ? 's' : ''} ${names}${more} not passing`;
  }
  return null;
}
