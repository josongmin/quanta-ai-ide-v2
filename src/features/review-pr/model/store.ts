import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  SAMPLE_PRS,
  type Comment,
  type ConversationItem,
  type FileDiff,
  type LineThread,
  type PullRequest,
  type ReviewVerdict,
  type ReviewerState,
  type PrStatus,
} from '@entities/pr';

/** Identity of the local user — used as default actor for write actions and
    for "Author/Reviewer of yours" UI badges. Real wiring would replace this
    with whatever the auth layer surfaces. */
export const viewerLogin = 'songmin';

type ReviewState = {
  prs: PullRequest[];
  activeNumber: number | null;

  setActivePr: (n: number | null) => void;
  markFileViewed: (prNumber: number, filePath: string, viewed: boolean) => void;
  postLineComment: (
    prNumber: number,
    filePath: string,
    line: number,
    body: string,
    authorLogin?: string,
  ) => void;
  resolveThread: (prNumber: number, threadId: string, resolved: boolean) => void;
  postPrComment: (prNumber: number, body: string, authorLogin?: string) => void;
  submitReview: (
    prNumber: number,
    verdict: ReviewVerdict,
    body: string,
    authorLogin?: string,
  ) => void;
  mergePr: (prNumber: number, mode: 'merge' | 'squash' | 'rebase') => void;
};

// Deterministic id generation. A monotonic counter beats Date.now()/Math.random()
// in tests and avoids React key churn during transient re-renders.
let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function updatePr(
  prs: PullRequest[],
  prNumber: number,
  fn: (pr: PullRequest) => PullRequest,
): PullRequest[] {
  let changed = false;
  const next = prs.map((pr) => {
    if (pr.number !== prNumber) return pr;
    changed = true;
    return fn(pr);
  });
  return changed ? next : prs;
}

function bumpUpdated<T extends PullRequest>(pr: T): T {
  return { ...pr, updatedAt: nowIso() };
}

function reviewerStateAfter(
  current: ReviewerState,
  verdict: ReviewVerdict,
): ReviewerState {
  if (verdict === 'approve') return 'approved';
  if (verdict === 'request-changes') return 'changes-requested';
  // 'comment' — only upgrade away from 'pending', never overwrite a stronger state.
  return current === 'pending' ? 'commented' : current;
}

function statusAfterReview(
  pr: PullRequest,
  reviewers: PullRequest['reviewers'],
  verdict: ReviewVerdict,
): PrStatus {
  if (verdict === 'request-changes') return 'changes-requested';
  if (verdict === 'approve') {
    // All reviewers (treated as required for now) approved → status flips.
    const allApproved = reviewers.length > 0
      && reviewers.every((r) => r.state === 'approved');
    if (allApproved) return 'approved';
  }
  return pr.status;
}

export const useReviewStore = create<ReviewState>()((set) => ({
  prs: SAMPLE_PRS,
  activeNumber: SAMPLE_PRS[0]?.number ?? null,

  setActivePr: (n) => { set({ activeNumber: n }); },

  markFileViewed: (prNumber, filePath, viewed) => {
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        let touched = false;
        const files: FileDiff[] = pr.files.map((f) => {
          if (f.path !== filePath || f.viewed === viewed) return f;
          touched = true;
          return { ...f, viewed };
        });
        if (!touched) return pr;
        return bumpUpdated({ ...pr, files });
      }),
    }));
  },

  postLineComment: (prNumber, filePath, line, body, authorLogin) => {
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    const author = authorLogin ?? viewerLogin;
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        const comment: Comment = {
          id: nextId('cm'),
          authorLogin: author,
          body: trimmed,
          createdAt: nowIso(),
          resolved: false,
        };
        let appended = false;
        const threads = pr.threads.map((t) => {
          if (appended) return t;
          if (t.filePath !== filePath || t.line !== line) return t;
          appended = true;
          return { ...t, comments: [...t.comments, comment] };
        });
        if (!appended) {
          const fresh: LineThread = {
            id: nextId('lt'),
            filePath,
            line,
            comments: [comment],
            resolved: false,
          };
          threads.push(fresh);
        }
        return bumpUpdated({ ...pr, threads });
      }),
    }));
  },

  resolveThread: (prNumber, threadId, resolved) => {
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        let touched = false;
        const threads = pr.threads.map((t) => {
          if (t.id !== threadId || t.resolved === resolved) return t;
          touched = true;
          return { ...t, resolved };
        });
        if (!touched) return pr;
        return bumpUpdated({ ...pr, threads });
      }),
    }));
  },

  postPrComment: (prNumber, body, authorLogin) => {
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    const author = authorLogin ?? viewerLogin;
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        const item: ConversationItem = {
          kind: 'comment',
          id: nextId('cv'),
          authorLogin: author,
          body: trimmed,
          createdAt: nowIso(),
        };
        return bumpUpdated({ ...pr, conversation: [...pr.conversation, item] });
      }),
    }));
  },

  submitReview: (prNumber, verdict, body, authorLogin) => {
    const author = authorLogin ?? viewerLogin;
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        const item: ConversationItem = {
          kind: 'review',
          id: nextId('rv'),
          authorLogin: author,
          verdict,
          body: body.trim(),
          createdAt: nowIso(),
        };
        let reviewerSeen = false;
        const reviewers = pr.reviewers.map((r) => {
          if (r.login !== author) return r;
          reviewerSeen = true;
          return { ...r, state: reviewerStateAfter(r.state, verdict) };
        });
        // If the actor is not yet a reviewer, register them with the implied state.
        const finalReviewers = reviewerSeen
          ? reviewers
          : [...reviewers, { login: author, state: reviewerStateAfter('pending', verdict) }];
        const status = statusAfterReview(pr, finalReviewers, verdict);
        return bumpUpdated({
          ...pr,
          reviewers: finalReviewers,
          status,
          conversation: [...pr.conversation, item],
        });
      }),
    }));
  },

  mergePr: (prNumber, mode) => {
    set((s) => ({
      prs: updatePr(s.prs, prNumber, (pr) => {
        if (pr.status === 'merged') return pr;
        const item: ConversationItem = {
          kind: 'event',
          id: nextId('ev'),
          eventType: 'merged',
          actorLogin: viewerLogin,
          detail: `merged via ${mode}`,
          createdAt: nowIso(),
        };
        return bumpUpdated({
          ...pr,
          status: 'merged',
          conversation: [...pr.conversation, item],
        });
      }),
    }));
  },
}));

/** Look up a single PR by number. Stable reference until the PR mutates. */
export function usePr(n: number | null | undefined): PullRequest | null {
  return useReviewStore(
    useShallow((s) => {
      if (n === null || n === undefined) return null;
      return s.prs.find((p) => p.number === n) ?? null;
    }),
  );
}

/** Return the currently selected PR (or null). */
export function useActivePr(): PullRequest | null {
  return useReviewStore(
    useShallow((s) => {
      if (s.activeNumber === null) return null;
      return s.prs.find((p) => p.number === s.activeNumber) ?? null;
    }),
  );
}
