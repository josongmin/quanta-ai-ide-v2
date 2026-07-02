import type { ReactNode } from 'react';
import {
  AlertTriangle, GitBranch, GitMerge, Repeat, Squircle, type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PullRequest, ReviewerState } from '@entities/pr';
import { Avatar, useReviewStore } from '@features/review-pr';
import { Badge } from '@shared/ui/Badge';

export function ReviewRailSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
        {label}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

export function ParticipantsSection({
  pr,
}: {
  pr: PullRequest;
}) {
  const { t } = useTranslation('review');

  return (
    <ReviewRailSection label="Participants">
      <Participant login={pr.author} role="author" />
      {pr.reviewers.map((r) => (
        <Participant
          key={r.login}
          login={r.login}
          role="reviewer"
          state={r.state}
        />
      ))}
      {pr.reviewers.length === 0 && (
        <div className="text-[11px] text-[var(--fg-subtle)]">{t('empty.noReviewers')}</div>
      )}
    </ReviewRailSection>
  );
}

function Participant({
  login,
  role,
  state,
}: {
  login: string;
  role: 'author' | 'reviewer';
  state?: ReviewerState;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar login={login} size={20} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate text-[var(--fg-default)]">@{login}</div>
        <div className="text-[10px] uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">{role}</div>
      </div>
      {state !== undefined && (
        <Badge
          variant={
            state === 'approved' ? 'success'
              : state === 'changes-requested' ? 'danger'
                : 'neutral'
          }
          fill="soft"
        >
          {state === 'changes-requested' ? 'Changes' : state}
        </Badge>
      )}
    </div>
  );
}

export function BranchSection({
  pr,
  blockerColor,
}: {
  pr: PullRequest;
  blockerColor: string;
}) {
  const { t } = useTranslation('review');

  return (
    <ReviewRailSection label="Branch">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--fg-default)]">
        <GitBranch className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{pr.baseBranch}</span>
        <span className="text-[var(--fg-subtle)]">←</span>
        <span className="truncate">{pr.headBranch}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--fg-subtle)]">{t('merge.aheadBehind')}</span>
        <span className="text-[11px] font-mono tabular-nums">
          <span style={{ color: 'var(--intent-success-vivid)' }}>+{pr.ahead}</span>
          <span className="text-[var(--fg-subtle)]"> / </span>
          <span style={{ color: 'var(--intent-danger-vivid)' }}>−{pr.behind}</span>
        </span>
      </div>
      {pr.hasConflicts && (
        <div
          className="flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md text-[11px]"
          style={{ background: `color-mix(in srgb, ${blockerColor} 10%, transparent)`, color: blockerColor, border: `1px solid color-mix(in srgb, ${blockerColor} 33%, transparent)` }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{t('merge.conflictsPresent')}</span>
        </div>
      )}
    </ReviewRailSection>
  );
}

export function MergeActionsSection({ pr }: { pr: PullRequest }) {
  const mergePr = useReviewStore((s) => s.mergePr);
  const block = mergeBlocker(pr);
  const enabled = block === null;
  const buttons: { key: 'merge' | 'squash' | 'rebase'; label: string; Icon: LucideIcon }[] = [
    { key: 'merge', label: 'Merge', Icon: GitMerge },
    { key: 'squash', label: 'Squash', Icon: Squircle },
    { key: 'rebase', label: 'Rebase', Icon: Repeat },
  ];

  return (
    <ReviewRailSection label="Merge">
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
                ? 'linear-gradient(140deg, color-mix(in srgb, var(--intent-success-fg) 22%, transparent), color-mix(in srgb, var(--intent-success-fg) 6%, transparent))'
                : 'var(--bg-hover)',
              color: enabled ? 'var(--intent-success-fg)' : 'var(--fg-subtle)',
              border: enabled ? '1px solid color-mix(in srgb, var(--intent-success-fg) 45%, transparent)' : '1px solid var(--border-default)',
            }}
            title={block ?? `${b.label} into ${pr.baseBranch}`}
          >
            <b.Icon className="w-3 h-3" />
            {b.label}
          </button>
        ))}
      </div>
      {block !== null && (
        <div className="mt-1 text-[11px] text-[var(--fg-muted)]">
          Blocked because {block}.
        </div>
      )}
    </ReviewRailSection>
  );
}

function mergeBlocker(pr: PullRequest): string | null {
  if (pr.status === 'merged') return 'this PR is already merged';
  if (pr.status === 'closed') return 'this PR is closed';
  if (pr.hasConflicts) return 'the branch has unresolved conflicts';

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
