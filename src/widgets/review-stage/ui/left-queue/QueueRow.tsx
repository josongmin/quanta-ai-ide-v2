import { useEffect, useState, type DragEvent } from 'react';
import {
  AlertTriangle, Check, GitMerge, GripVertical, MessageSquare, Pin,
} from 'lucide-react';
import { findPerson } from '@entities/pr';
import { authorAvatarColor, shortAge } from './styling';
import { StateLabel } from './StateLabel';
import { SignalChip, CiChip } from './SignalChip';
import type { Annotated } from './types';

// ─────────────────────────────────────────────────────────────────────────
// 5. QueueRow — refined row matching the screenshot
// ─────────────────────────────────────────────────────────────────────────

// Information design grounded in PR-review research:
//
//   • Sadowski et al. (Google ICSE 2018) — "Modern Code Review at Google":
//     35% of PRs in review-state are still WIP/draft and shouldn't enter
//     triage. Re-review (new commits since last verdict) is the #2
//     question reviewers ask after "is it my turn?".
//   • Bacchelli & Bird (MS, 2013): reviewers triage on *risk*, not on
//     *size*. Author identity strongly modulates risk perception
//     (junior author + critical path = top of queue).
//   • Greiler et al. (MS, 2022): own-queue triage dominates team-queue;
//     reviewers reorder based on "what action this needs from me" first.
//   • GitHub PR list (the affordance reviewers already know): author
//     avatar + title + meta strip is the dominant pattern.
//
// Visual weight order in a row (top-down):
//
//   row 1   [rail][avatar]  title #N                          age
//   row 2                   state-label · signals             pin
//
//   • Avatar (16px) — author identity. Replaces the abstract status
//     dot, which encoded viewer-state we now express as a labelled chip.
//   • State-label is the *first* chip on row 2 — "내 차례" / "재검토
//     필요" / "approved" / "draft" / "팀 대기" — telling the reviewer
//     in plain language what the PR wants from them.
//   • Signal chips render only when non-zero (low noise floor).
export function QueueRow({
  ann, active, pinned,
  isDragging = false, isDropTarget = false,
  onClick, onTogglePin,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  ann: Annotated;
  active: boolean;
  pinned: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDragStart?: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}) {
  const { pr, risk, engine, ci, myState, needsReReview, approvedCount, reviewerCount, tier } = ann;
  const author = findPerson(pr.author);
  const avatarTone = authorAvatarColor(author.hue);

  // SLA bucket (DORA leading indicator). 24h aging, 72h stale. Date.now
  // would be impure under React 19 — read via effect into state.
  const [ageBucket, setAgeBucket] = useState<'fresh' | 'aging' | 'stale'>('fresh');
  useEffect(() => {
    const compute = (): void => {
      if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') {
        setAgeBucket('fresh');
        return;
      }
      const ageHours = (Date.now() - new Date(pr.updatedAt).getTime()) / 3_600_000;
      if (ageHours >= 72) setAgeBucket('stale');
      else if (ageHours >= 24) setAgeBucket('aging');
      else setAgeBucket('fresh');
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => { window.clearInterval(id); };
  }, [pr.status, pr.updatedAt]);

  // Verdict rail tone — single source of truth for the row's left
  // accent. Priority: blocker findings > CI fail > conflict > stale
  // SLA > critical risk > re-review > high finding > attention risk
  // > aging SLA. Drafts and terminal PRs get no rail (they belong
  // outside the active triage flow).
  let railTone: string | null = null;
  if (pr.status === 'closed' || pr.status === 'merged' || pr.status === 'draft') {
    railTone = null;
  } else if (engine.blocker > 0)        railTone = 'var(--intent-danger-fg)';
  else if (ci.required.failed > 0)      railTone = 'var(--intent-danger-fg)';
  else if (pr.hasConflicts)             railTone = 'var(--intent-danger-fg)';
  else if (ageBucket === 'stale')       railTone = 'var(--intent-danger-fg)';
  else if (risk.tier === 'critical')    railTone = 'var(--intent-danger-fg)';
  else if (needsReReview)               railTone = 'var(--intent-warn-fg)';
  else if (engine.high > 0)             railTone = 'var(--intent-warn-fg)';
  else if (risk.tier === 'attention')   railTone = 'var(--intent-warn-fg)';
  else if (ageBucket === 'aging')       railTone = 'var(--intent-warn-fg)';

  // CI rollup. running > failed > passed > none. Reviewers want to
  // see "fail" loudly, "pass" quietly (default expectation), and
  // "running" as informational.
  const ciState: 'pass' | 'fail' | 'running' | 'none' =
    ci.required.failed > 0 ? 'fail'
    : ci.required.pending > 0 ? 'running'
    : (ci.required.passed > 0 ? 'pass' : 'none');

  // Drafts get muted treatment regardless of other signals — Sadowski
  // 2018: drafts shouldn't compete for triage attention.
  const isDraft = pr.status === 'draft';
  const isTerminal = pr.status === 'closed' || pr.status === 'merged';

  return (
    <div
      className={`group relative flex items-start gap-2.5 pl-3 pr-2 py-2 cursor-pointer transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${isDraft || isTerminal ? 'opacity-65' : ''}`}
      role="button"
      tabIndex={0}
      draggable={pinned}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        // Active row uses a token-driven surface, not bg-white/X — so
        // the selection works on both dark and light without depending
        // on the inversion CSS rules.
        background: active ? 'var(--bg-selected)' : undefined,
        ...(isDropTarget && { boxShadow: 'inset 0 2px 0 0 var(--border-focus)' }),
      }}
    >
      {/* Verdict rail — 2px left edge. */}
      {railTone !== null && (
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: railTone }}
        />
      )}
      {/* Active indicator — punches through any rail tone. */}
      {active && (
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: 'var(--fg-strong)' }}
        />
      )}
      {/* Drag handle — only on pinned rows, hover-revealed. */}
      {pinned && onDragStart && (
        <span
          aria-hidden
          className="absolute -left-px top-1/2 -translate-y-1/2 inline-flex items-center opacity-0 group-hover:opacity-60 transition-opacity"
          style={{ color: 'var(--fg-muted)' }}
          title="드래그하여 순서 변경"
        >
          <GripVertical className="w-2.5 h-3" />
        </span>
      )}

      {/* Author avatar — first information chunk: who wrote this. */}
      <span
        aria-hidden
        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold mt-0.5"
        style={{ background: avatarTone.bg, color: avatarTone.fg }}
        title={`${author.display} (@${pr.author})`}
      >
        {author.initials}
      </span>

      <div className="min-w-0 flex-1">
        {/* Row 1: title #N · age (right) */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`text-md leading-snug truncate ${active ? 'font-semibold' : 'font-medium'}`}
            style={{ color: 'var(--fg-default)' }}
          >
            {pr.title}
          </span>
          <span
            className="shrink-0 text-[10px] font-mono tabular-nums"
            style={{ color: 'var(--fg-subtle)' }}
          >
            #{pr.number}
          </span>
          <span
            className="ml-auto shrink-0 text-[10px] font-mono tabular-nums"
            style={{
              color: ageBucket === 'stale' ? 'var(--intent-danger-fg)'
                : ageBucket === 'aging' ? 'var(--intent-warn-fg)'
                : 'var(--fg-subtle)',
            }}
            title={ageBucket === 'stale'
              ? '72h+ — SLA stale'
              : ageBucket === 'aging' ? '24h+ — aging'
              : pr.updatedAt}
          >
            {shortAge(pr.updatedAt)}
          </span>
        </div>

        {/* Row 2: state-label first, then critical signals.
            Order = decision priority. State chip uses tier+myState
            to render the clearest "what does this want from me?" word. */}
        <div
          className="mt-1 flex items-center gap-2 text-sm min-w-0"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <StateLabel
            tier={tier}
            myState={myState}
            needsReReview={needsReReview}
            status={pr.status}
          />
          {engine.blocker > 0 && (
            <SignalChip
              tone="var(--intent-danger-fg)"
              icon={<AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />}
              label={String(engine.blocker)}
              title={`${String(engine.blocker)} blocker finding${engine.blocker === 1 ? '' : 's'}`}
            />
          )}
          {ciState !== 'none' && <CiChip state={ciState} ci={ci} />}
          {pr.hasConflicts && (
            <SignalChip
              tone="var(--intent-danger-fg)"
              icon={<GitMerge className="w-2.5 h-2.5" strokeWidth={2.5} />}
              label="conflict"
              title="merge conflicts — resolve before review"
            />
          )}
          {/* Approval ratio — only when at least one approval exists or
              ≥2 reviewers requested. "1/2 ✓" telegraphs "needs one more
              approval to ship", which Greiler 2022 found is the #1 ask
              for finished-author-side reviewers waiting for a co-sign. */}
          {reviewerCount >= 2 && approvedCount > 0 && (
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums"
              style={{ color: approvedCount === reviewerCount ? 'var(--intent-success-fg)' : 'var(--fg-muted)' }}
              title={`${String(approvedCount)} of ${String(reviewerCount)} reviewers approved`}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
              {approvedCount}/{reviewerCount}
            </span>
          )}
          {pr.threads.length > 0 && (
            <span
              className="inline-flex items-center gap-1 font-mono tabular-nums"
              title={`${String(pr.threads.length)} unresolved thread${pr.threads.length === 1 ? '' : 's'}`}
            >
              <MessageSquare className="w-2.5 h-2.5" strokeWidth={2} />
              {pr.threads.length}
            </span>
          )}
          {/* Pin handle — right-anchored on row 2 so row 1 stays
              uncluttered. Visible when pinned, fades in on hover. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            aria-label={pinned ? 'PR 핀 해제' : 'PR 핀 고정'}
            title={pinned ? '핀 해제' : '핀 고정'}
            className={`ml-auto shrink-0 inline-flex items-center justify-center w-4 h-4 rounded transition-opacity ${
              pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100'
            }`}
          >
            <Pin
              className="w-2.5 h-2.5"
              strokeWidth={2}
              style={pinned ? { color: 'var(--fg-accent)', fill: 'var(--fg-accent)' } : { color: 'var(--fg-muted)' }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
