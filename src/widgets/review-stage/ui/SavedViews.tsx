// ─────────────────────────────────────────────────────────────────────────
// SavedViews — saved-filter strip below the project header.
//
// Each "view" is a named recipe of (scope, free-text-query). Linear's
// "Custom views" + Height's "Saved filters" are the industry pattern;
// they take the most common review-time questions and turn them into
// 1-click filters.
//
// Why this matters (objective grounding):
//
//   • Krug (2014) "Don't Make Me Think" — the single biggest lift in
//     a list UI is reducing query *re-derivation cost*. A reviewer
//     who looks at "내 24h 만료 위험" 5 times a day shouldn't have to
//     re-type the filter every time.
//   • Pirolli & Card (1999) information foraging — saved views act
//     as *information patches*. They concentrate "scent" so foraging
//     time drops to ~1 click.
//   • Linear changelog (2024) reports their "favourite views" feature
//     as the single largest reviewer-engagement uplift after the
//     queue-grouping redesign.
//
// Default views are *built-in*, not user-defined, so the affordance
// works on first-load. The `+` button on ProjectHeader (which the
// queue already exposes) eventually saves a custom one — for now it
// shows a "future" tooltip. Active view applies query+scope at once.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { Bookmark} from 'lucide-react';
import { AlertCircle, Bookmark as BookmarkIcon, Clock, FileWarning, X } from 'lucide-react';
import {
  computePrRisk, summariseChecks, type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import type { QueueScope } from './LeftQueue';
import {
  loadCustomViews, addCustomView, removeCustomView,
  type CustomView,
} from '../lib/customViewStore';
import ShareViewButton from './ShareViewButton';

export type SavedView = {
  id: string;
  label: string;
  /** Lucide icon component. */
  icon: typeof Bookmark;
  /** Tone used by the chip when active. */
  tone: string;
  /** Predicate over a PR — used to count and filter. */
  match: (pr: PullRequest, repo: RepoData, viewerLogin: string) => boolean;
  /** When applied, this view forces the queue's scope. */
  scope: QueueScope;
};

// ── View library ─────────────────────────────────────────────────────────

const VIEWS: SavedView[] = [
  {
    // The #1 question a reviewer asks the queue (Greiler MS 2022).
    // Matches both "pending reviewer" and the implicit "I left a
    // verdict but new commits landed" re-review case.
    id: 'my-turn',
    label: '내 차례',
    icon: AlertCircle,
    tone: 'var(--fg-default)',
    scope: 'all',
    match: (pr, _repo, viewer) => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') return false;
      const me = pr.reviewers.find((r) => r.login === viewer);
      if (me?.state === 'pending') return true;
      // Re-review: viewer left a review but new commits arrived after.
      if (me === undefined) return false;
      let myLatestReviewAt: string | null = null;
      for (const item of pr.conversation) {
        if (item.kind !== 'review' || item.authorLogin !== viewer) continue;
        if (myLatestReviewAt === null || item.createdAt > myLatestReviewAt) {
          myLatestReviewAt = item.createdAt;
        }
      }
      if (myLatestReviewAt === null) return false;
      for (const item of pr.conversation) {
        if (item.kind !== 'event' || item.eventType !== 'commit') continue;
        if (item.createdAt > myLatestReviewAt) return true;
      }
      return false;
    },
  },
  {
    id: 'sla-risk',
    label: 'SLA 위험',
    icon: Clock,
    tone: 'var(--intent-warn-fg)',
    scope: 'all',
    match: (pr) => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') return false;
      const ageMs = Date.now() - new Date(pr.updatedAt).getTime();
      const hours = ageMs / 3_600_000;
      return hours >= 24;
    },
  },
  {
    id: 'blockers',
    label: '블로커 있음',
    icon: AlertCircle,
    tone: 'var(--intent-danger-fg)',
    scope: 'all',
    match: (pr) => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') return false;
      const ci = summariseChecks(pr.checks);
      return ci.required.failed > 0 || pr.hasConflicts;
    },
  },
  {
    id: 'risky',
    label: '고위험',
    icon: FileWarning,
    tone: 'var(--intent-danger-fg)',
    scope: 'all',
    match: (pr, repo) => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') return false;
      return computePrRisk(pr, repo).tier === 'critical';
    },
  },
];

// ── Component ────────────────────────────────────────────────────────────

type Props = {
  prs: PullRequest[];
  repo: RepoData;
  viewerLogin: string;
  /** Currently-applied built-in view id, or null. */
  activeViewId: string | null;
  onApply: (view: SavedView | null) => void;
  /** Currently-applied custom view id, or null. */
  activeCustomId?: string | null;
  /** Apply a stored custom view (or null to clear). */
  onApplyCustom?: (view: CustomView | null) => void;
  /** Current scope + query — needed for "save current as view". */
  currentScope?: QueueScope;
  currentQuery?: string;
};

export default function SavedViews({
  prs, repo, viewerLogin, activeViewId, onApply,
  activeCustomId = null, onApplyCustom,
  currentScope, currentQuery,
}: Props) {
  // User-defined views — hydrated on mount. Add/remove rewrites the
  // store and updates state.
  const [customViews, setCustomViews] = useState<CustomView[]>(() => loadCustomViews());
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [draftLabel, setDraftLabel] = useState('');

  const canSave = currentScope !== undefined
    && currentQuery !== undefined
    && currentQuery.trim().length > 0;
  const submitSave = (): void => {
    if (currentScope === undefined || currentQuery === undefined) return;
    const label = draftLabel.trim();
    if (label.length === 0) return;
    const next = addCustomView(label, currentScope, currentQuery);
    setCustomViews(next);
    setDraftLabel('');
    setShowSavePrompt(false);
  };
  const onRemove = (id: string): void => {
    setCustomViews(removeCustomView(id));
  };
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of VIEWS) m.set(v.id, 0);
    for (const pr of prs) {
      for (const v of VIEWS) {
        if (v.match(pr, repo, viewerLogin)) {
          m.set(v.id, (m.get(v.id) ?? 0) + 1);
        }
      }
    }
    return m;
  }, [prs, repo, viewerLogin]);

  // Hide entirely when no view has any matches AND no custom views
  // exist AND save isn't possible. Otherwise the strip carries
  // either built-in chips, custom chips, or the save affordance.
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0 && customViews.length === 0 && !canSave) return null;

  return (
    <div
      className="shrink-0 flex items-center gap-1.5 px-3 pb-2 overflow-x-auto"
      role="tablist"
      aria-label="저장된 뷰"
    >
      {VIEWS.map((v) => {
        const count = counts.get(v.id) ?? 0;
        if (count === 0) return null;
        const active = activeViewId === v.id;
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => { onApply(active ? null : v); }}
            className="shrink-0 inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[10px] font-mono tabular-nums transition-colors"
            style={{
              background: active ? `color-mix(in srgb, ${v.tone} 12%, transparent)` : 'var(--bg-surface-muted)',
              border: active
                ? `1px solid color-mix(in srgb, ${v.tone} 33%, transparent)`
                : '1px solid var(--border-default)',
              color: active ? v.tone : 'var(--fg-muted)',
            }}
            title={active ? `${v.label} 해제` : `${v.label} 적용`}
          >
            <Icon className="w-2.5 h-2.5" strokeWidth={2.2} />
            {v.label}
            <span
              className="font-mono tabular-nums"
              style={{ color: active ? v.tone : 'var(--fg-muted)' }}
            >
              {count}
            </span>
          </button>
        );
      })}
      {/* Custom user-saved views */}
      {customViews.map((cv) => {
        const active = activeCustomId === cv.id;
        const tone = 'var(--fg-accent)'; // single tone for all customs
        return (
          <span key={cv.id} className="shrink-0 inline-flex items-center group">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { onApplyCustom?.(active ? null : cv); }}
              className="inline-flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-l-full text-[10px] font-mono transition-colors"
              style={{
                background: active ? `color-mix(in srgb, ${tone} 12%, transparent)` : 'var(--bg-surface-muted)',
                border: active ? `1px solid color-mix(in srgb, ${tone} 33%, transparent)` : '1px solid var(--border-default)',
                borderRight: 'none',
                color: active ? tone : 'var(--fg-muted)',
              }}
              title={`${cv.label} · scope=${cv.scope} · "${cv.query}"`}
            >
              <BookmarkIcon className="w-2.5 h-2.5" strokeWidth={2.2} />
              {cv.label}
            </button>
            <button
              type="button"
              onClick={() => { onRemove(cv.id); }}
              aria-label={`${cv.label} 삭제`}
              title="저장된 뷰 삭제"
              className="inline-flex items-center justify-center h-6 w-5 rounded-r-full text-[var(--fg-subtle)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors"
              style={{
                background: active ? `color-mix(in srgb, ${tone} 12%, transparent)` : 'var(--bg-surface-muted)',
                border: active ? `1px solid color-mix(in srgb, ${tone} 33%, transparent)` : '1px solid var(--border-default)',
                borderLeft: 'none',
              }}
            >
              <X className="w-2.5 h-2.5" strokeWidth={2.5} />
            </button>
          </span>
        );
      })}
      {/* "Save current" affordance — only when there's something to
          save. Inline prompt appears when clicked; press Enter to
          confirm, Esc to cancel. */}
      {canSave && !showSavePrompt && (
        <>
          <button
            type="button"
            onClick={() => { setShowSavePrompt(true); setDraftLabel(currentQuery ?? ''); }}
            title="현재 검색을 뷰로 저장"
            className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-mono text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] transition-colors"
            style={{ border: '1px dashed var(--border-strong)' }}
          >
            <BookmarkIcon className="w-2.5 h-2.5" strokeWidth={2.2} />
            저장
          </button>
          {/* Copy a shareable URL hash of the current scope+query.
              Sadowski 2018: lowest-friction async coordination. */}
          <ShareViewButton scope={currentScope ?? 'all'} query={currentQuery ?? ''} />
        </>
      )}
      {showSavePrompt && (
        <span
          className="shrink-0 inline-flex items-center gap-1 h-6 px-2 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--fg-accent) 40%, transparent)',
          }}
        >
          <input
            autoFocus
            type="text"
            value={draftLabel}
            onChange={(e) => { setDraftLabel(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitSave(); }
              else if (e.key === 'Escape') { setShowSavePrompt(false); setDraftLabel(''); }
            }}
            placeholder="이름…"
            className="bg-transparent outline-none text-[10px] font-mono text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] w-20"
          />
          <button
            type="button"
            onClick={submitSave}
            disabled={draftLabel.trim().length === 0}
            className="text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-accent)] disabled:opacity-40"
          >
            저장
          </button>
        </span>
      )}
    </div>
  );
}

