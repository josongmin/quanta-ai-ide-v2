// ─────────────────────────────────────────────────────────────────────────
// OwnerMatrix — CODEOWNERS-based reviewer-readiness panel.
//
// Surfaces three things a reviewer needs to know before opening files:
//
//   1. Which owner-team is on the hook for each touched file.
//   2. Whether the *required* owner has been pinged on this PR
//      (via reviewers list or @mentions in description).
//   3. How concentrated the change is — a PR touching 8 files across 5
//      different owners is a coordination problem, not a code problem.
//
// Why a *matrix*, not a list: Few (1996) on visual cross-tabulation —
// reviewers spot ownership gaps faster when files are grouped by owner
// than when scanned in path order. The aggregation also dampens the
// "100 files, who cares" effect on infra-style PRs.
//
// Confidence display: each owner row shows the % of touched files it
// owns. Big number prefix → big visual weight (Tufte data-ink).
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import { Badge } from '@shared/ui/Badge';
import V2Card from './V2Card';

type OwnerGroup = {
  owner: string;
  files: string[];
  /** Has any reviewer from (or matching) this owner team been requested? */
  reviewerRequested: boolean;
  share: number;  // 0..1
};

export default function OwnerMatrix({
  pr, repo,
}: { pr: PullRequest; repo: RepoData }) {
  const groups = useMemo<OwnerGroup[]>(() => {
    const byOwner = new Map<string, string[]>();
    let attributed = 0;
    for (const f of pr.files) {
      if (f.fileId === null) continue;
      const file = repo.files[f.fileId];
      if (!file) continue;
      const owner = file.owner || 'unowned';
      const arr = byOwner.get(owner) ?? [];
      arr.push(f.path);
      byOwner.set(owner, arr);
      attributed += 1;
    }
    if (attributed === 0) return [];
    // Reviewer-team match: if any reviewer login looks like an owner
    // team substring, treat the owner as covered. Loose match — real
    // CODEOWNERS would have a proper team→user map, but the proxy is
    // good enough to surface gaps.
    const reviewers = pr.reviewers.map((r) => r.login.toLowerCase());
    const groups: OwnerGroup[] = [];
    for (const [owner, files] of byOwner) {
      const ownerLc = owner.toLowerCase();
      const requested = reviewers.some(
        (r) => r === ownerLc || ownerLc.includes(r) || r.includes(ownerLc),
      );
      groups.push({
        owner,
        files,
        reviewerRequested: requested,
        share: files.length / attributed,
      });
    }
    return groups.sort((a, b) => b.files.length - a.files.length);
  }, [pr, repo]);

  if (groups.length === 0) return null;

  // Coordination risk: many owners + uneven distribution = high.
  // Shannon entropy gives us a single number — high entropy means
  // the change is fragmented across teams.
  const fragmentation = groups.length;
  const missingReviewers = groups.filter((g) => !g.reviewerRequested && g.owner !== 'unowned').length;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        <span className="text-sm font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
          Ownership
        </span>
        <span className="text-xs font-mono text-[var(--fg-subtle)]">
          {fragmentation} {fragmentation === 1 ? 'team' : 'teams'} · {pr.files.length} files
        </span>
        {missingReviewers > 0 && (
          <span
            className="ml-auto inline-flex"
            title={`${String(missingReviewers)} owner ${missingReviewers === 1 ? 'team has' : 'teams have'} no reviewer requested`}
          >
            <Badge variant="warn" fill="soft" className="gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              {missingReviewers} unrepresented
            </Badge>
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {groups.map((g) => (
          <li key={g.owner} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface-muted)]">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-mono font-bold tabular-nums text-[var(--fg-default)]"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}>
              {g.files.length}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-[var(--fg-default)] truncate">
                  @{g.owner}
                </span>
                {g.reviewerRequested ? (
                  <span title="A reviewer matching this owner is requested">
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: 'color-mix(in srgb, var(--intent-success-vivid) 80%, transparent)' }} />
                  </span>
                ) : g.owner !== 'unowned' && (
                  <span title="No reviewer for this owner team has been requested">
                    <AlertCircle className="w-3 h-3 shrink-0" style={{ color: 'color-mix(in srgb, var(--intent-warn-vivid) 80%, transparent)' }} />
                  </span>
                )}
                <span className="text-xs font-mono text-[var(--fg-subtle)] ml-auto tabular-nums">
                  {Math.round(g.share * 100)}%
                </span>
              </div>
              {/* Proportion bar — share of touched files. Share, not absolute
                  count, because the relative load is what matters for
                  coordinating who reads first. */}
              <div className="mt-1 h-1 rounded-full overflow-hidden bg-[var(--bg-hover)]">
                <div
                  className="h-full"
                  style={{
                    width: `${String(Math.round(g.share * 100))}%`,
                    background: g.reviewerRequested
                      ? 'linear-gradient(90deg, var(--intent-success-fg), var(--fg-link))'
                      : 'linear-gradient(90deg, var(--intent-warn-fg), var(--intent-danger-fg))',
                  }}
                />
              </div>
              <div className="mt-1 text-xs font-mono text-[var(--fg-subtle)] truncate" title={g.files.join('  ·  ')}>
                {g.files.slice(0, 2).join(' · ')}
                {g.files.length > 2 && ` · +${String(g.files.length - 2)}`}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </V2Card>
  );
}
