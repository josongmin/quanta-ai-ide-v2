// Triage classification helpers — pure functions consumed by the
// LeftQueue group-sort and by individual row chips.

import type { engineSummary, summariseChecks, PullRequest } from '@entities/pr';
import type { TriageTier } from './types';

export function triageTier(
  pr: PullRequest,
  myState: 'pending' | 'approved' | 'changes-requested' | 'commented' | null,
  engine: ReturnType<typeof engineSummary>,
  ci: ReturnType<typeof summariseChecks>,
  needsReReview: boolean,
): TriageTier {
  if (pr.status === 'closed' || pr.status === 'merged') return 5;
  if (pr.status === 'draft') return 4;
  // My-turn dominates everything else — once it's my action, I want
  // to see it regardless of CI state. The CI failure shows up as a
  // chip on the row, but the row itself stays in the my-turn band.
  if (myState === 'pending' || needsReReview) return 0;
  // Blocked = author needs to act. CI failure / conflict / blocker
  // findings without my approval — none of the next steps are mine.
  const isBlocked = ci.required.failed > 0 || pr.hasConflicts || engine.blocker > 0;
  if (myState === 'approved') {
    // I'm done. If still blocked, it's still author's problem; bucket
    // as ready-to-merge so the reviewer can confirm "did the last
    // approval ship?" without scrolling.
    return isBlocked ? 3 : 1;
  }
  if (isBlocked) return 3;
  return 2;
}

export function computeNeedsReReview(pr: PullRequest, viewerLogin: string): boolean {
  // Reviewer left a verdict but new commits landed afterwards. We
  // walk the conversation timeline backwards to find the viewer's
  // latest review event, then check for a `commit` event after it.
  let myLatestReviewAt: string | null = null;
  for (const item of pr.conversation) {
    if (item.kind !== 'review') continue;
    if (item.authorLogin !== viewerLogin) continue;
    if (myLatestReviewAt === null || item.createdAt > myLatestReviewAt) {
      myLatestReviewAt = item.createdAt;
    }
  }
  if (myLatestReviewAt === null) return false;
  for (const item of pr.conversation) {
    if (item.kind !== 'event') continue;
    if (item.eventType !== 'commit') continue;
    if (item.createdAt > myLatestReviewAt) return true;
  }
  return false;
}
