import { beforeEach, describe, it, expect } from 'vitest';
import { useReviewStore, viewerLogin } from '../store';
import { SAMPLE_PRS, type PullRequest } from '@entities/pr';

// The review-pr store owns PR review semantics: reviewer-state monotonicity
// (a bare 'comment' never downgrades a stronger verdict), status roll-up
// (approved only when every reviewer approved), line-thread creation vs.
// append, and merge idempotency. All synchronous — no timers, no storage.
// Ids come from a module-global counter + ISO timestamps, so we assert on
// structure/relationships, never on exact id strings.

const s = () => useReviewStore.getState();

// Fixture-derived PR numbers we lean on. Confirmed by reading sample.ts:
//   214 → changes-requested; reviewers haeun(changes-requested), jiho(commented)
//   218 → open;   reviewers songmin(pending)
//   221 → open;   reviewers songmin(pending), haeun(pending)
//   205 → merged; reviewers songmin(approved), haeun(approved)
//   222 → draft;  reviewers [] (empty)
const PR_CHANGES = 214;
const PR_ONE_PENDING = 218;
const PR_TWO_PENDING = 221;
const PR_MERGED = 205;
const PR_DRAFT_NO_REVIEWERS = 222;

function pr(number: number): PullRequest {
  const found = s().prs.find((p) => p.number === number);
  if (!found) throw new Error(`fixture PR #${number} missing`);
  return found;
}

function reviewer(number: number, login: string) {
  return pr(number).reviewers.find((r) => r.login === login);
}

beforeEach(() => {
  // No reset action — restore the mutable seed slice (deep clone so nested
  // reviewers/threads/conversation arrays from a prior test don't bleed).
  useReviewStore.setState({
    prs: SAMPLE_PRS.map((p) => structuredClone(p)),
    activeNumber: SAMPLE_PRS[0]?.number ?? null,
  });
});

describe('review-pr store — reviewer-state monotonicity', () => {
  it("'approve' sets the actor's reviewer state to approved", () => {
    s().submitReview(PR_ONE_PENDING, 'approve', 'lgtm', 'songmin');
    expect(reviewer(PR_ONE_PENDING, 'songmin')!.state).toBe('approved');
  });

  it("'request-changes' sets the actor's reviewer state to changes-requested", () => {
    s().submitReview(PR_ONE_PENDING, 'request-changes', 'needs work', 'songmin');
    expect(reviewer(PR_ONE_PENDING, 'songmin')!.state).toBe('changes-requested');
  });

  it("'comment' upgrades a pending reviewer to commented", () => {
    expect(reviewer(PR_ONE_PENDING, 'songmin')!.state).toBe('pending');
    s().submitReview(PR_ONE_PENDING, 'comment', 'a note', 'songmin');
    expect(reviewer(PR_ONE_PENDING, 'songmin')!.state).toBe('commented');
  });

  it("'comment' does NOT downgrade an already-approved reviewer", () => {
    // 205: songmin is already 'approved'.
    expect(reviewer(PR_MERGED, 'songmin')!.state).toBe('approved');
    s().submitReview(PR_MERGED, 'comment', 'still fine', 'songmin');
    expect(reviewer(PR_MERGED, 'songmin')!.state).toBe('approved');
  });

  it("'comment' does NOT downgrade an already changes-requested reviewer", () => {
    // 214: haeun is already 'changes-requested'.
    expect(reviewer(PR_CHANGES, 'haeun')!.state).toBe('changes-requested');
    s().submitReview(PR_CHANGES, 'comment', 'drive-by note', 'haeun');
    expect(reviewer(PR_CHANGES, 'haeun')!.state).toBe('changes-requested');
  });
});

describe('review-pr store — statusAfterReview', () => {
  it('flips to approved only once every reviewer has approved', () => {
    // 221 starts with two pending reviewers.
    expect(pr(PR_TWO_PENDING).status).toBe('open');

    s().submitReview(PR_TWO_PENDING, 'approve', 'ok', 'songmin');
    // One of two approved → not yet all-approved, status untouched.
    expect(pr(PR_TWO_PENDING).status).toBe('open');

    s().submitReview(PR_TWO_PENDING, 'approve', 'ok', 'haeun');
    // Now every reviewer approved → status flips.
    expect(pr(PR_TWO_PENDING).status).toBe('approved');
  });

  it("'request-changes' drives status to changes-requested", () => {
    expect(pr(PR_ONE_PENDING).status).toBe('open');
    s().submitReview(PR_ONE_PENDING, 'request-changes', 'nope', 'songmin');
    expect(pr(PR_ONE_PENDING).status).toBe('changes-requested');
  });

  it('a lone comment leaves status untouched', () => {
    const before = pr(PR_ONE_PENDING).status;
    s().submitReview(PR_ONE_PENDING, 'comment', 'thinking out loud', 'songmin');
    expect(pr(PR_ONE_PENDING).status).toBe(before);
  });

  it('a single approve on a one-reviewer PR flips to approved', () => {
    // 218 has exactly one reviewer — approving it satisfies "all approved".
    expect(pr(PR_ONE_PENDING).reviewers).toHaveLength(1);
    s().submitReview(PR_ONE_PENDING, 'approve', 'ship it', 'songmin');
    expect(pr(PR_ONE_PENDING).status).toBe('approved');
  });
});

describe('review-pr store — submitReview reviewer registration', () => {
  it('registers a brand-new actor as a reviewer with the implied state', () => {
    // 218 has no reviewer named "newperson".
    expect(reviewer(PR_ONE_PENDING, 'newperson')).toBeUndefined();

    s().submitReview(PR_ONE_PENDING, 'request-changes', 'hold on', 'newperson');

    const added = reviewer(PR_ONE_PENDING, 'newperson');
    expect(added).toBeDefined();
    expect(added!.state).toBe('changes-requested');
  });

  it('records the review as a conversation item', () => {
    const before = pr(PR_ONE_PENDING).conversation.length;
    s().submitReview(PR_ONE_PENDING, 'comment', 'note body', 'songmin');
    const conv = pr(PR_ONE_PENDING).conversation;
    expect(conv).toHaveLength(before + 1);
    const last = conv[conv.length - 1];
    expect(last.kind).toBe('review');
  });

  it('defaults the actor to the viewer login when none is passed', () => {
    s().submitReview(PR_TWO_PENDING, 'approve', 'ok');
    expect(reviewer(PR_TWO_PENDING, viewerLogin)!.state).toBe('approved');
  });
});

describe('review-pr store — postLineComment', () => {
  it('creates a fresh thread when none matches file+line', () => {
    const before = pr(PR_ONE_PENDING).threads.length;
    s().postLineComment(PR_ONE_PENDING, 'src/brand-new.ts', 42, 'first!', 'songmin');

    const threads = pr(PR_ONE_PENDING).threads;
    expect(threads).toHaveLength(before + 1);
    const created = threads.find((t) => t.filePath === 'src/brand-new.ts' && t.line === 42);
    expect(created).toBeDefined();
    expect(created!.comments).toHaveLength(1);
    expect(created!.comments[0].body).toBe('first!');
    expect(created!.resolved).toBe(false);
  });

  it('appends to an existing thread on matching file+line', () => {
    s().postLineComment(PR_ONE_PENDING, 'src/shared.ts', 10, 'one', 'songmin');
    const afterFirst = pr(PR_ONE_PENDING).threads.length;

    s().postLineComment(PR_ONE_PENDING, 'src/shared.ts', 10, 'two', 'haeun');

    // No new thread — appended to the existing one.
    expect(pr(PR_ONE_PENDING).threads).toHaveLength(afterFirst);
    const thread = pr(PR_ONE_PENDING).threads.find(
      (t) => t.filePath === 'src/shared.ts' && t.line === 10,
    );
    expect(thread!.comments).toHaveLength(2);
    expect(thread!.comments.map((c) => c.body)).toEqual(['one', 'two']);
  });

  it('is a no-op for an empty or whitespace-only body', () => {
    const before = pr(PR_ONE_PENDING).threads.length;
    s().postLineComment(PR_ONE_PENDING, 'src/x.ts', 1, '', 'songmin');
    s().postLineComment(PR_ONE_PENDING, 'src/x.ts', 1, '   \n\t', 'songmin');
    expect(pr(PR_ONE_PENDING).threads).toHaveLength(before);
  });

  it('trims the stored comment body', () => {
    s().postLineComment(PR_ONE_PENDING, 'src/trim.ts', 5, '  padded  ', 'songmin');
    const thread = pr(PR_ONE_PENDING).threads.find(
      (t) => t.filePath === 'src/trim.ts' && t.line === 5,
    );
    expect(thread!.comments[0].body).toBe('padded');
  });
});

describe('review-pr store — mergePr idempotency', () => {
  it('merging an open PR sets status merged and records one event', () => {
    const before = pr(PR_TWO_PENDING).conversation.length;
    s().mergePr(PR_TWO_PENDING, 'squash');

    expect(pr(PR_TWO_PENDING).status).toBe('merged');
    const conv = pr(PR_TWO_PENDING).conversation;
    expect(conv).toHaveLength(before + 1);
    const last = conv[conv.length - 1];
    expect(last.kind).toBe('event');
    if (last.kind === 'event') expect(last.eventType).toBe('merged');
  });

  it('merging an already-merged PR is a no-op (no duplicate event)', () => {
    // 205 is already 'merged'.
    const beforeRef = pr(PR_MERGED);
    expect(beforeRef.status).toBe('merged');
    const beforeConv = beforeRef.conversation.length;

    s().mergePr(PR_MERGED, 'merge');

    const after = pr(PR_MERGED);
    expect(after.status).toBe('merged');
    expect(after.conversation).toHaveLength(beforeConv);
    // updatePr returns the same reference when the fn returns the input pr.
    expect(after).toBe(beforeRef);
  });

  it('does not touch PRs other than the target', () => {
    const untouched = pr(PR_DRAFT_NO_REVIEWERS);
    s().mergePr(PR_TWO_PENDING, 'rebase');
    expect(pr(PR_DRAFT_NO_REVIEWERS)).toBe(untouched);
  });
});
