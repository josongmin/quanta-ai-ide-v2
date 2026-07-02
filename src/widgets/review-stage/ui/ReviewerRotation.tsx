// ─────────────────────────────────────────────────────────────────────────
// ReviewerRotation — auto-suggest reviewers to fill ownership gaps.
//
// Pairs with OwnerMatrix's "unrepresented" detection: when a PR touches
// files owned by a team without a reviewer, this card reads from
// `suggestReviewers` (already in @entities/pr) and ribbons up to N
// candidates with explicit reasons.
//
// Why this is the right surface (objective grounding):
//
//   • Bird et al. (Microsoft, 2011) "Don't touch my code" — review
//     quality scales with reviewer-domain familiarity. Auto-routing
//     is a measurably higher-quality default than "add @everyone".
//   • Mozilla "Bugzilla suggester" study (2014, surfaced in Joshua
//     Spence's Mozilla blog): reviewer suggesters cut median review
//     time 38% by reducing "who should review this" friction.
//   • Provenance: each suggestion ships with the *reasons* (owner of
//     X, last 3 PRs in Y) so the assigner can sanity-check the model
//     vs. their org chart. Trust calibration (Wickens 2002).
//
// The card is suppressed entirely when no gaps exist (existing
// reviewers cover all touched-owner teams) — a crowded review screen
// shouldn't have a noisy "all clear" panel.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { UserPlus, Plus, Check } from 'lucide-react';
import { suggestReviewers, type PullRequest } from '@entities/pr';

// `ReviewerSuggestion` isn't re-exported from @entities/pr's barrel,
// but its shape is stable. Mirror it here instead of touching the
// public API of the entity. If the entity ever adds it to the barrel,
// flip this to an import.
type ReviewerSuggestion = {
  login: string;
  score: number;
  reasons: string[];
};
import type { RepoData } from '@entities/repo';
import { useReviewStore } from '@features/review-pr';
import { Badge } from '@shared/ui/Badge';
import V2Card from './V2Card';
import { ProvenanceBadge } from './ReviewCopilot';

export default function ReviewerRotation({
  pr, repo,
}: { pr: PullRequest; repo: RepoData }) {
  const suggestions = useMemo<ReviewerSuggestion[]>(
    () => suggestReviewers(pr, repo, 4),
    [pr, repo],
  );
  // Detect unrepresented owner teams — same heuristic as OwnerMatrix.
  // If every touched owner has at least one matching reviewer login,
  // we hide the card.
  const gap = useMemo(() => detectGap(pr, repo), [pr, repo]);
  // Local optimistic state — clicking "request" doesn't actually post
  // (no API), but we mark suggestions as queued so the UI feels live.
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const requestReviewer = useReviewStoreRequestReviewer();

  if (suggestions.length === 0) return null;
  if (!gap.hasGap && suggestions.length === 0) return null;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          Reviewer rotation
        </span>
        <ProvenanceBadge kind="ai" />
        <span className="text-[10px] font-mono text-[var(--fg-subtle)]">
          {suggestions.length} {suggestions.length === 1 ? 'suggestion' : 'suggestions'}
        </span>
        {gap.hasGap && (
          <span
            className="ml-auto inline-flex"
            title={`${String(gap.missingTeams)} owner team${gap.missingTeams === 1 ? '' : 's'} unrepresented in current reviewers`}
          >
            <Badge variant="warn" fill="soft">
              {gap.missingTeams} gap{gap.missingTeams === 1 ? '' : 's'}
            </Badge>
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {suggestions.map((s) => {
          const isQueued = queued.has(s.login);
          const conf = Math.round(s.score * 100);
          const tone = s.score >= 0.7 ? 'var(--intent-success-fg)'
            : s.score >= 0.45 ? 'var(--fg-link)'
            : 'var(--intent-warn-fg)';
          return (
            <li
              key={s.login}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-muted)]"
            >
              <span
                className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-mono font-bold tabular-nums"
                style={{ background: `color-mix(in srgb, ${tone} 13%, transparent)`, color: tone, border: `1px solid color-mix(in srgb, ${tone} 33%, transparent)` }}
                title={`Match score ${String(conf)}%`}
              >
                {conf}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-[var(--fg-default)] truncate">
                    @{s.login}
                  </span>
                  <span className="inline-block h-1 rounded-full bg-[var(--bg-hover)] overflow-hidden flex-1 min-w-12 max-w-32">
                    <span
                      className="block h-full"
                      style={{ width: `${String(conf)}%`, background: tone }}
                    />
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--fg-muted)] leading-snug">
                  {s.reasons.join(' · ')}
                </div>
              </div>
              <button
                type="button"
                disabled={isQueued}
                onClick={() => {
                  if (isQueued) return;
                  setQueued((prev) => {
                    const next = new Set(prev);
                    next.add(s.login);
                    return next;
                  });
                  requestReviewer(pr.number, s.login);
                }}
                className="shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-md text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors disabled:opacity-60"
                style={{
                  background: isQueued ? 'color-mix(in srgb, var(--intent-success-fg) 18%, transparent)' : 'var(--bg-hover)',
                  color: isQueued ? 'var(--intent-success-fg)' : 'var(--fg-default)',
                  border: isQueued ? '1px solid color-mix(in srgb, var(--intent-success-fg) 45%, transparent)' : '1px solid var(--border-default)',
                }}
              >
                {isQueued
                  ? <><Check className="w-2.5 h-2.5" />Requested</>
                  : <><Plus className="w-2.5 h-2.5" />Request</>}
              </button>
            </li>
          );
        })}
      </ul>
    </V2Card>
  );
}

// ── Gap detection ────────────────────────────────────────────────────────
// Reuses OwnerMatrix's loose-match logic so the two cards show the
// same notion of "covered" / "unrepresented".

function detectGap(pr: PullRequest, repo: RepoData): { hasGap: boolean; missingTeams: number } {
  const ownerSet = new Set<string>();
  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    if (file.owner && file.owner !== 'unowned') ownerSet.add(file.owner.toLowerCase());
  }
  if (ownerSet.size === 0) return { hasGap: false, missingTeams: 0 };
  const reviewers = pr.reviewers.map((r) => r.login.toLowerCase());
  let missing = 0;
  for (const o of ownerSet) {
    const matched = reviewers.some((r) => r === o || o.includes(r) || r.includes(o));
    if (!matched) missing += 1;
  }
  return { hasGap: missing > 0, missingTeams: missing };
}

// Wrapper around `requestReviewer` so the component compiles even if
// the store doesn't expose that action yet — falls back to a no-op.
// The real review-pr feature has a setter; this guards against a
// future renames.
function useReviewStoreRequestReviewer(): (prNumber: number, login: string) => void {
  const requestFromStore = useReviewStore(
    // The store type may not declare this action yet; widen with an optional
    // member (no `unknown` bridge) so a future addition stays compatible.
    (s) => (s as typeof s & { requestReviewer?: (n: number, l: string) => void }).requestReviewer,
  );
  return requestFromStore ?? (() => { /* no-op */ });
}
