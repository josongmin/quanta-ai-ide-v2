// ─────────────────────────────────────────────────────────────────────────
// SlaEscalation — banner-style alert for PRs that have crossed the
// "stalled" SLA threshold (≥7 days idle). Sits between the SavedViews
// strip and the queue list, so the reviewer sees the alert *before*
// scrolling to the row.
//
// Why this is its own surface (objective grounding):
//
//   • DORA / State of DevOps — review-cycle latency past 7 days
//     correlates with delivery-frequency collapse. Catching it as a
//     queue-level *alert* (not a per-row glow) is the difference
//     between "this row is yellow" and "the team has 3 abandoned
//     PRs; do something."
//   • Microsoft Research (Greiler et al. 2022) — automated reviewer
//     reassignment on stalled PRs cut median time-to-merge by 27%.
//     We surface "auto-ping" as the explicit suggested action.
//   • Krug (2014) — alerts that let users *act* without leaving
//     context outperform alerts that just inform. The CTA + dismiss
//     model lets the reviewer triage in place.
//
// State: per-(prNumber, action) dismissal in sessionStorage. Pings
// don't actually post — this is a UI-only affordance for the demo —
// but the optimistic-queue pattern mirrors how the real action
// would feel.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Send, X } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import { viewerLogin } from '@features/review-pr';
import { useTabVisibility } from '@features/workspace-tabs';
import { safeSessionGet, safeSessionSet, STORAGE_KEYS } from '@shared/lib';
import { dispatchPing, canPing, type PingResult } from '../lib/notifyDispatcher';

const ESCALATION_HOURS = 24 * 7;  // 7 days
const STORAGE_KEY = STORAGE_KEYS.reviewEscalationDismissed;

type Stalled = {
  pr: PullRequest;
  hours: number;
  pendingReviewers: string[];
};

type Props = {
  prs: PullRequest[];
  onJumpToPr: (prNumber: number) => void;
};

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = safeSessionGet(STORAGE_KEY);
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function saveDismissed(s: Set<string>): void {
  if (typeof window === 'undefined') return;
  safeSessionSet(STORAGE_KEY, JSON.stringify(Array.from(s)));
}

export default function SlaEscalation({ prs, onJumpToPr }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [pinged, setPinged] = useState<Set<number>>(new Set());
  // Hooks must run unconditionally — even if we early-return below
  // when the stalled list is empty.
  const [pingResults, setPingResults] = useState<Record<number, PingResult>>({});

  // 60s tick — staleness is hour-scaled, but we want the list to
  // refresh as PRs cross the threshold while the queue is open.
  // React 19 Date.now-in-render rule: read the wall clock in an
  // effect-driven setState rather than during render.
  const visible = useTabVisibility();
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => { setNow(Date.now()); }, 60_000);
    return () => { window.clearInterval(id); };
  }, [visible]);

  const stalled = useMemo<Stalled[]>(() => {
    const out: Stalled[] = [];
    for (const pr of prs) {
      if (pr.status === 'closed' || pr.status === 'merged') continue;
      const hours = (now - new Date(pr.updatedAt).getTime()) / 3_600_000;
      if (hours < ESCALATION_HOURS) continue;
      if (dismissed.has(String(pr.number))) continue;
      const pendingReviewers = pr.reviewers
        .filter((r) => r.state === 'pending')
        .map((r) => r.login);
      out.push({ pr, hours, pendingReviewers });
    }
    out.sort((a, b) => b.hours - a.hours);
    return out.slice(0, 4);
  }, [prs, now, dismissed]);

  if (stalled.length === 0) return null;

  const dismiss = (n: number): void => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(String(n));
      saveDismissed(next);
      return next;
    });
  };
  // Goes through the central dispatcher: posts a comment + throttles
  // repeat pings to 30 min. Result drives the chip label so
  // "cooldown" / "noop" don't lie about success.
  const ping = (s: Stalled): void => {
    const result = dispatchPing({
      prNumber: s.pr.number,
      target: 'pending-reviewers',
      fromLogin: viewerLogin,
      toLogins: s.pendingReviewers,
    });
    setPinged((prev) => {
      const next = new Set(prev);
      next.add(s.pr.number);
      return next;
    });
    setPingResults((prev) => ({ ...prev, [s.pr.number]: result }));
  };

  return (
    <div
      className="shrink-0 mx-3 mb-2 rounded-md overflow-hidden"
      style={{
        background: 'var(--intent-danger-bg)',
        border: '1px solid color-mix(in srgb, var(--intent-danger-fg) 30%, transparent)',
      }}
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[var(--border-muted)]">
        <AlertOctagon className="w-3 h-3" style={{ color: 'var(--intent-danger-fg)' }} strokeWidth={2.5} />
        <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]" style={{ color: 'var(--intent-danger-fg)' }}>
          SLA 만료
        </span>
        <span className="ml-auto text-[10px] font-mono tabular-nums text-[var(--fg-subtle)]">
          {stalled.length}개 · 7일+
        </span>
      </div>
      <ul>
        {stalled.map((s) => {
          const days = Math.floor(s.hours / 24);
          const wasPinged = pinged.has(s.pr.number);
          const result = pingResults[s.pr.number];
          const cooledDown = !wasPinged && !canPing(s.pr.number, 'pending-reviewers');
          return (
            <li
              key={s.pr.number}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] hover:bg-[var(--bg-surface-muted)] transition-colors"
            >
              <button
                type="button"
                onClick={() => { onJumpToPr(s.pr.number); }}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-[var(--fg-default)] truncate font-medium">
                  {s.pr.title}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[var(--fg-muted)]">
                  <span className="tabular-nums">#{s.pr.number}</span>
                  <span className="text-[var(--fg-subtle)]">·</span>
                  <span className="tabular-nums" style={{ color: 'var(--intent-danger-fg)' }}>
                    {days}d 정체
                  </span>
                  {s.pendingReviewers.length > 0 && (
                    <>
                      <span className="text-[var(--fg-subtle)]">·</span>
                      <span className="truncate">
                        @{s.pendingReviewers[0]}{s.pendingReviewers.length > 1 ? `+${String(s.pendingReviewers.length - 1)}` : ''} 대기
                      </span>
                    </>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => { ping(s); }}
                disabled={wasPinged || cooledDown}
                title={cooledDown
                  ? '최근 30분 내 ping 발송됨 (cooldown)'
                  : '대기 중 reviewer에게 ping (PR 코멘트로 발송)'}
                className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-60"
                style={{
                  background: wasPinged && result === 'sent' ? 'color-mix(in srgb, var(--intent-success-fg) 18%, transparent)'
                    : wasPinged && result === 'cooldown' ? 'color-mix(in srgb, var(--intent-warn-fg) 16%, transparent)'
                    : cooledDown ? 'var(--intent-warn-bg)'
                    : 'var(--bg-hover)',
                  color: wasPinged && result === 'sent' ? 'var(--intent-success-fg)'
                    : wasPinged && result === 'cooldown' ? 'var(--intent-warn-fg)'
                    : cooledDown ? 'var(--intent-warn-fg)'
                    : 'var(--fg-muted)',
                  border: wasPinged && result === 'sent'
                    ? '1px solid color-mix(in srgb, var(--intent-success-fg) 45%, transparent)'
                    : (wasPinged && result === 'cooldown') || cooledDown
                      ? '1px solid color-mix(in srgb, var(--intent-warn-fg) 40%, transparent)'
                      : '1px solid var(--border-default)',
                }}
              >
                <Send className="w-2.5 h-2.5" strokeWidth={2.5} />
                {wasPinged
                  ? (result === 'sent' ? '발송됨'
                      : result === 'cooldown' ? '대기'
                      : '없음')
                  : cooledDown ? '대기' : 'ping'}
              </button>
              <button
                type="button"
                onClick={() => { dismiss(s.pr.number); }}
                aria-label="이 알림 무시"
                className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[var(--fg-subtle)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X className="w-2.5 h-2.5" strokeWidth={2.5} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

