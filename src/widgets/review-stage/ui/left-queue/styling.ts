import type {
  engineSummary, summariseChecks,
  PullRequest,
} from '@entities/pr';
import type { TriageTier } from './types';

// ── Repo color coding ────────────────────────────────────────────────────
//
// Identity-hue per repo, stable across sessions (hash of name → hue).
// Tufte: a category that recurs throughout the surface earns one hue,
// reused everywhere. Saturation/lightness are fixed so the palette
// reads as a *set*, not a rainbow — only hue varies.
//
// Two surfaces consume this:
//   • Initial badge in the group header (fill)
//   • 1px stripe on rows in that group (low-alpha left edge)
//
// We keep saturation low (~28%) and lightness mid (~62%) so the badges
// never out-shout the status dot or risk accent.
export function repoHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}
export function repoBadgeColor(name: string): { bg: string; fg: string; line: string } {
  const h = repoHue(name);
  return {
    bg:   `hsla(${String(h)}, 35%, 55%, 0.18)`,
    fg:   `hsla(${String(h)}, 50%, 80%, 1)`,
    line: `hsla(${String(h)}, 35%, 60%, 0.30)`,
  };
}

// ── Author avatar ────────────────────────────────────────────────────────
// Hue-keyed initials chip. Echoes the repo-badge palette but dialed
// brighter so the eye reads "person" before "category". 16×16 — same
// height as the row's status glyph, so the two read as a paired column.
export function authorAvatarColor(hue: number): { bg: string; fg: string } {
  return {
    bg: `hsla(${String(hue)}, 55%, 55%, 0.22)`,
    fg: `hsla(${String(hue)}, 60%, 38%, 1)`,
  };
}

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

function shortAge(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const ms = Date.now() - t;
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just';
  if (m < 60) return `${String(m)}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${String(h)}h`;
  const d = Math.floor(h / 24);
  return `${String(d)}d`;
}

export { shortAge };
