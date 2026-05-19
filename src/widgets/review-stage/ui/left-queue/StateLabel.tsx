import type { PullRequest } from '@entities/pr';
import type { TriageTier } from './types';

// ── StateLabel — "what does this PR want from me?" in one chip ───────────
//
// Plain-language label keyed off the composite triage tier. Uses tone
// only on action-needed rows; informational states stay neutral so
// they don't compete with critical signals next to them.
export function StateLabel({
  tier, myState, needsReReview, status,
}: {
  tier: TriageTier;
  myState: 'pending' | 'approved' | 'changes-requested' | 'commented' | null;
  needsReReview: boolean;
  status: PullRequest['status'];
}) {
  let label: string;
  let tone: string | null;
  let dot: string | null = null;

  if (status === 'merged') { label = 'merged'; tone = null; }
  else if (status === 'closed') { label = 'closed'; tone = null; }
  else if (status === 'draft') { label = 'draft'; tone = null; }
  else if (needsReReview) { label = '재검토 필요'; tone = 'var(--intent-warn-fg)'; dot = 'var(--intent-warn-fg)'; }
  else if (myState === 'pending') { label = '내 차례'; tone = 'var(--fg-default)'; dot = 'var(--fg-default)'; }
  else if (myState === 'approved') { label = '승인함'; tone = 'var(--intent-success-fg)'; }
  else if (myState === 'changes-requested') { label = '변경 요청함'; tone = 'var(--intent-warn-fg)'; }
  else if (tier === 1) { label = '머지 대기'; tone = null; }
  else if (tier === 3) { label = '작성자 대기'; tone = null; }
  else { label = '팀 대기'; tone = null; }

  return (
    <span
      className="inline-flex items-center gap-1 shrink-0"
      style={{ color: tone ?? 'var(--fg-muted)' }}
    >
      {dot !== null && (
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
      )}
      <span className="font-medium">{label}</span>
    </span>
  );
}
