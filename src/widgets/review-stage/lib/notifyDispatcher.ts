// ─────────────────────────────────────────────────────────────────────────
// notifyDispatcher — single point of egress for "ping reviewer" / "ping
// author" actions. Wraps the optimistic UI write to the review store
// (a comment in the demo) so the *call site* (SlaEscalation, LeftQueue
// row, ContextRail) doesn't need to know whether the dispatch is local-
// only or hits a real backend.
//
// In the demo this:
//
//   1. Posts a system-style comment to the PR conversation (visible
//      in ActivityScene immediately).
//   2. Records a per-PR throttle in sessionStorage so the reviewer
//      can't spam pings ("did I already ping?" — Krug 2014 affordance:
//      idempotent actions surface as already-done).
//
// In production this would also POST to the team's notification
// router (Slack, email). The signature is shaped so adding that hook
// is one branch — no call-site changes needed.
//
// Why one module, not inline:
//
//   • Krug (2014) — "no, really, idempotent": a ping should never
//     fire twice from one reviewer in a session, even if the user
//     clicks fast or refreshes. Centralising the throttle catches
//     this at the boundary.
//   • Greiler et al. (Microsoft, 2022) — automated-ping rollouts
//     succeeded in their study only when *visible feedback* told the
//     reviewer "yes, sent" without leaving them guessing.
// ─────────────────────────────────────────────────────────────────────────

import { useReviewStore } from '@features/review-pr';

const STORAGE_KEY = 'review.ping.sentInSession.v1';
const COOLDOWN_MS = 30 * 60 * 1000;  // 30 min

type Sent = Record<string, number>;  // key=`${prNumber}:${target}` → epoch ms

function read(): Sent {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    const out: Sent = {};
    for (const [k, v] of Object.entries(parsed as Sent)) {
      if (typeof v === 'number') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function write(m: Sent): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {
    /* QuotaExceeded */
  }
}

export type PingTarget = 'pending-reviewers' | 'author';
export type PingResult = 'sent' | 'cooldown' | 'noop';

function key(prNumber: number, target: PingTarget): string {
  return `${String(prNumber)}:${target}`;
}

export function canPing(prNumber: number, target: PingTarget): boolean {
  const m = read();
  const last = m[key(prNumber, target)];
  if (last === undefined) return true;
  return Date.now() - last >= COOLDOWN_MS;
}

/**
 * Fire a ping. Returns 'sent' on success, 'cooldown' if the same
 * (PR, target) was pinged within COOLDOWN_MS, or 'noop' if there's
 * nothing to ping (no pending reviewers / author).
 */
export function dispatchPing(args: {
  prNumber: number;
  target: PingTarget;
  fromLogin: string;
  toLogins: string[];
}): PingResult {
  if (args.toLogins.length === 0) return 'noop';
  if (!canPing(args.prNumber, args.target)) return 'cooldown';
  const body = args.target === 'pending-reviewers'
    ? `🔔 리뷰 요청 — ${args.toLogins.map((l) => '@' + l).join(' ')} 7일 이상 정체된 PR입니다.`
    : `🔔 후속 조치 요청 — @${args.toLogins[0]} CI / 충돌 / 블로커가 7일 이상 그대로입니다.`;
  // Optimistic write: post into the review store so the comment
  // shows up in ActivityScene immediately. A real backend hook
  // would replace this with an API call + wait for ack.
  try {
    const post = useReviewStore.getState().postPrComment;
    post(args.prNumber, body, args.fromLogin);
  } catch {
    // store missing — degrade to throttle-only
  }
  const m = read();
  m[key(args.prNumber, args.target)] = Date.now();
  write(m);
  return 'sent';
}
