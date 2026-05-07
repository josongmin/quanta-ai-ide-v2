import { useMemo } from 'react';
import {
  AlertTriangle, GitBranch, GitMerge, Hash, Squircle, Repeat,
} from 'lucide-react';
import type {
  CheckRun, PullRequest, ReviewerState,
} from '@entities/pr';
import { Avatar, useReviewStore } from '@features/review-pr';
import { useTranslation } from '@shared/i18n';

// Right rail. Mirrors CodingStage.ContextRail's shell (260px aside, header
// strip, scrollable section list, footer) but the sections are PR-centric:
// participants, linked issues, branch state, merge actions.

type Props = {
  pr: PullRequest;
  isDark: boolean;
};

export default function PrContextRail({ pr, isDark }: Props) {
  const border = isDark ? 'border-white/5' : 'border-black/5';
  const textMuted = isDark ? 'text-white/55' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

  return (
    <aside
      className="shrink-0 w-[260px] flex flex-col"
      style={{
        backgroundColor: isDark ? 'rgba(8, 12, 20, 0.55)' : 'rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <div className={`shrink-0 h-11 flex items-center px-4 border-b ${border}`}>
        <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textMuted}`}>
          PR context
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
        <ParticipantsSection pr={pr} isDark={isDark} />
        <LinkedIssuesSection pr={pr} isDark={isDark} />
        <BranchSection pr={pr} isDark={isDark} />
        <MergeActionsSection pr={pr} isDark={isDark} />
      </div>

      <div className={`shrink-0 px-4 py-3 border-t ${border} text-[10px] font-mono ${textFaint}`}>
        @{pr.author} · #{pr.number}
      </div>
    </aside>
  );
}

// ─── Section frame ───────────────────────────────────────────────────────

function Section({
  label, isDark, children,
}: {
  label: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const color = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div>
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${color}`}>
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── Participants ────────────────────────────────────────────────────────

function ParticipantsSection({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  return (
    <Section label="Participants" isDark={isDark}>
      <ParticipantRow login={pr.author} role="author" isDark={isDark} />
      {pr.reviewers.map((r) => (
        <ParticipantRow
          key={r.login}
          login={r.login}
          role="reviewer"
          state={r.state}
          isDark={isDark}
        />
      ))}
      {pr.reviewers.length === 0 && (
        <div className={`text-[11px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          No reviewers requested.
        </div>
      )}
    </Section>
  );
}

function ParticipantRow({
  login, role, state, isDark,
}: {
  login: string;
  role: 'author' | 'reviewer';
  state?: ReviewerState;
  isDark: boolean;
}) {
  const name = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <div className="flex items-center gap-2">
      <Avatar login={login} size={20} />
      <div className="flex-1 min-w-0">
        <div className={`text-[11px] truncate ${name}`}>@{login}</div>
        <div className={`text-[10px] uppercase tracking-[0.18em] ${muted}`}>
          {role}
        </div>
      </div>
      {state !== undefined && <ReviewerStatePill state={state} />}
    </div>
  );
}

function ReviewerStatePill({ state }: { state: ReviewerState }) {
  const meta = STATE_META[state];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
      style={{ background: `${meta.color}26`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

const STATE_META: Record<ReviewerState, { label: string; color: string }> = {
  pending:             { label: 'Pending',   color: '#8b949e' },
  approved:            { label: 'Approved',  color: '#5fa86c' },
  'changes-requested': { label: 'Changes',   color: '#c25a55' },
  commented:           { label: 'Commented', color: '#8b949e' },
};

// ─── Linked issues ───────────────────────────────────────────────────────

function LinkedIssuesSection({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  if (pr.linkedIssues.length === 0) {
    return (
      <Section label="Linked issues" isDark={isDark}>
        <div className={`text-[11px] ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          No linked issues.
        </div>
      </Section>
    );
  }
  const chip = isDark
    ? 'bg-white/[0.06] text-white/70 border-white/10'
    : 'bg-black/[0.04] text-black/70 border-black/10';
  return (
    <Section label="Linked issues" isDark={isDark}>
      <div className="flex flex-wrap gap-1">
        {pr.linkedIssues.map((n) => (
          <span
            key={n}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono ${chip}`}
          >
            <Hash className="w-2.5 h-2.5" />
            Closes #{n}
          </span>
        ))}
      </div>
    </Section>
  );
}

// ─── Branch ──────────────────────────────────────────────────────────────

function BranchSection({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  const { t } = useTranslation('review');
  const valueColor = isDark ? 'text-white/85' : 'text-black/85';
  const labelColor = isDark ? 'text-white/40' : 'text-black/40';
  return (
    <Section label="Branch" isDark={isDark}>
      <div className={`flex items-center gap-1.5 text-[11px] font-mono ${valueColor}`}>
        <GitBranch className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{pr.baseBranch}</span>
        <span className={labelColor}>←</span>
        <span className="truncate">{pr.headBranch}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] ${labelColor}`}>{t('merge.aheadBehind')}</span>
        <span className={`text-[11px] font-mono tabular-nums ${valueColor}`}>
          <span className="text-emerald-500">+{pr.ahead}</span>
          <span className={labelColor}> / </span>
          <span className="text-rose-500">−{pr.behind}</span>
        </span>
      </div>
      {pr.hasConflicts && (
        <div className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-400 text-[11px]">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{t('merge.conflictsPresent')}</span>
        </div>
      )}
    </Section>
  );
}

// ─── Merge actions ───────────────────────────────────────────────────────

function MergeActionsSection({ pr, isDark }: { pr: PullRequest; isDark: boolean }) {
  const mergePr = useReviewStore((s) => s.mergePr);

  const block = useMemo(() => mergeBlocker(pr), [pr]);

  const enabled = block === null;
  const buttons: { key: 'merge' | 'squash' | 'rebase'; label: string; Icon: typeof GitMerge }[] = [
    { key: 'merge',  label: 'Merge',  Icon: GitMerge },
    { key: 'squash', label: 'Squash', Icon: Squircle },
    { key: 'rebase', label: 'Rebase', Icon: Repeat },
  ];

  return (
    <Section label="Merge actions" isDark={isDark}>
      <div className="grid grid-cols-3 gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            disabled={!enabled}
            onClick={() => { mergePr(pr.number, b.key); }}
            className={`inline-flex items-center justify-center gap-1 h-8 rounded-md text-[11px] font-bold transition-colors ${
              enabled
                ? (isDark
                    ? 'bg-[#4f9a5c] text-black hover:bg-[#3fdd5b]'
                    : 'bg-[#1f883d] text-white hover:bg-[#26a047]')
                : (isDark
                    ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                    : 'bg-black/[0.05] text-black/30 cursor-not-allowed')
            }`}
            title={block ?? `${b.label} into ${pr.baseBranch}`}
          >
            <b.Icon className="w-3 h-3" />
            {b.label}
          </button>
        ))}
      </div>
      {block !== null && (
        <div className={`mt-1 text-[11px] ${isDark ? 'text-white/55' : 'text-black/55'}`}>
          Blocked because {block}.
        </div>
      )}
    </Section>
  );
}

// Returns a one-line reason explaining why merge is disabled, or `null`
// when the PR is mergeable. Wording is short and lower-cased so it can
// sit after "Blocked because ".
function mergeBlocker(pr: PullRequest): string | null {
  if (pr.status === 'merged') return 'this PR is already merged';
  if (pr.status === 'closed') return 'this PR is closed';
  if (pr.hasConflicts)        return 'the branch has unresolved conflicts';

  const blockingChecks = pr.checks.filter((c) => c.required && isCheckBlocking(c));
  if (blockingChecks.length > 0) {
    const names = blockingChecks.slice(0, 2).map((c) => c.name).join(', ');
    const more = blockingChecks.length > 2
      ? ` (+${String(blockingChecks.length - 2)} more)`
      : '';
    return `required check${blockingChecks.length > 1 ? 's' : ''} ${names}${more} not passing`;
  }

  return null;
}

function isCheckBlocking(c: CheckRun): boolean {
  return c.status === 'failure'
    || c.status === 'cancelled'
    || c.status === 'pending'
    || c.status === 'running';
}
