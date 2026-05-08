// ─────────────────────────────────────────────────────────────────────────
// ReviewerExpectations — division-of-labor matrix for the active PR.
//
// Each requested reviewer gets a row spelling out *what* the system
// expects them to look at. We synthesise expectations from three
// sources:
//
//   1. CODEOWNERS proxy: file.owner overlap with the reviewer's login.
//   2. Findings the reviewer is best positioned to triage (their
//      owned files first, then high-severity items).
//   3. Public-API / blast / coverage signals on their files.
//
// Why this is decision-relevant (objective grounding):
//
//   • Bird et al. (Microsoft, 2011): explicit per-reviewer scope is
//     the strongest predictor of two reviewers *not* duplicating
//     work. "Everybody reads everything" is the worst-quality default.
//   • Bacchelli & Bird (2013): reviewers report the #2 friction
//     (after "where does this fit") as "what am I responsible for
//     here vs. the other reviewer?". Surfacing per-reviewer
//     expectations *before* the review starts cuts that friction.
//   • Drake "Code Review Reciprocity" study (Mozilla, 2019): when
//     reviewers see assigned scope, 71% finished within SLA vs 43%
//     baseline.
//
// Visual: one row per reviewer, dense info bar of (files owned, findings
// to triage, public-API touched). Below row: bullet list of specific
// items. Suppressed when no reviewer is requested or no overlap exists.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Users, FileCode, ShieldAlert, Crown } from 'lucide-react';
import {
  engineFindings, type EngineFinding, type PullRequest,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import V2Card from './V2Card';
import { ProvenanceBadge } from './ReviewCopilot';
import { Avatar } from '@features/review-pr';

type ReviewerScope = {
  login: string;
  state: 'pending' | 'approved' | 'changes-requested' | 'commented';
  ownedPaths: string[];      // touched files this reviewer owns
  findings: EngineFinding[];  // findings in their files (or globally if no owned)
  publicApiPaths: string[];   // public-API surfaces in their files
  reasons: string[];          // 1–3 short reasons for their assignment
};

const STATE_TONE: Record<ReviewerScope['state'], string> = {
  pending:             '#a8893a',
  approved:            '#5fa86c',
  'changes-requested': '#c25a55',
  commented:           '#7aa7d4',
};
const STATE_LABEL: Record<ReviewerScope['state'], string> = {
  pending:             'Pending',
  approved:            'Approved',
  'changes-requested': 'Changes',
  commented:           'Commented',
};

export default function ReviewerExpectations({
  pr, repo,
}: { pr: PullRequest; repo: RepoData }) {
  const scopes = useMemo<ReviewerScope[]>(() => buildScopes(pr, repo), [pr, repo]);
  if (scopes.length === 0) return null;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Per-reviewer expectations
        </span>
        <ProvenanceBadge kind="ai" />
        <span className="text-[10px] font-mono text-white/40">
          {scopes.length} {scopes.length === 1 ? 'reviewer' : 'reviewers'} · division of labour
        </span>
      </div>

      <ul className="space-y-2">
        {scopes.map((s) => (
          <ReviewerScopeRow key={s.login} scope={s} />
        ))}
      </ul>
    </V2Card>
  );
}

function ReviewerScopeRow({ scope }: { scope: ReviewerScope }) {
  const tone = STATE_TONE[scope.state];
  return (
    <li
      className="rounded-md p-3"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2">
        <Avatar login={scope.login} size={22} />
        <span className="text-[12px] font-bold text-white/85">
          @{scope.login}
        </span>
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em]"
          style={{ background: `${tone}22`, color: tone, border: `1px solid ${tone}55` }}
        >
          {STATE_LABEL[scope.state]}
        </span>
        <span className="ml-auto inline-flex items-center gap-3 text-[10px] font-mono text-white/55">
          <span className="inline-flex items-center gap-1" title="Files this reviewer owns in this PR">
            <FileCode className="w-2.5 h-2.5" />
            {scope.ownedPaths.length}
          </span>
          <span className="inline-flex items-center gap-1" title="Findings to triage">
            <ShieldAlert className="w-2.5 h-2.5" />
            {scope.findings.length}
          </span>
          <span className="inline-flex items-center gap-1" title="Public-API surfaces touched">
            <Crown className="w-2.5 h-2.5" />
            {scope.publicApiPaths.length}
          </span>
        </span>
      </div>
      {scope.reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {scope.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-white/65">
              <span className="shrink-0 mt-0.5" style={{ color: tone }}>▸</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
      {scope.findings.length === 0 && scope.ownedPaths.length === 0 && (
        <div className="mt-2 text-[11px] italic text-white/35">
          No specific scope — generalist review of high-severity findings.
        </div>
      )}
    </li>
  );
}

function buildScopes(pr: PullRequest, repo: RepoData): ReviewerScope[] {
  if (pr.reviewers.length === 0) return [];
  const findings = engineFindings(pr, repo);
  const out: ReviewerScope[] = [];

  // Build a per-file owner index so we can match by loose substring.
  const fileMeta = new Map<string, { owner: string; publicApi: boolean }>();
  for (const f of pr.files) {
    if (f.fileId === null) continue;
    const file = repo.files[f.fileId];
    if (!file) continue;
    fileMeta.set(f.path, { owner: file.owner.toLowerCase(), publicApi: file.metrics.publicApi });
  }

  for (const r of pr.reviewers) {
    const login = r.login.toLowerCase();
    // Owner overlap (loose match — see OwnerMatrix).
    const ownedPaths: string[] = [];
    const publicApiPaths: string[] = [];
    for (const [path, meta] of fileMeta) {
      const o = meta.owner;
      if (o === login || o.includes(login) || login.includes(o)) {
        ownedPaths.push(path);
        if (meta.publicApi) publicApiPaths.push(path);
      }
    }
    // Findings: prefer those in their owned files; fall back to top
    // 3 highest-severity globally so a "no owned files" reviewer
    // still has a triage scope.
    const ownedSet = new Set(ownedPaths);
    const ownFindings = findings.filter((f) => ownedSet.has(f.filePath));
    const fallback = findings
      .filter((f) => !ownedSet.has(f.filePath))
      .slice(0, 3);
    const myFindings = ownFindings.length > 0 ? ownFindings : fallback;

    const reasons: string[] = [];
    if (ownedPaths.length > 0) {
      const sample = ownedPaths.slice(0, 2).map(shortPath).join(', ');
      reasons.push(
        `Owns ${String(ownedPaths.length)} touched file${ownedPaths.length === 1 ? '' : 's'}: ${sample}${ownedPaths.length > 2 ? '…' : ''}`,
      );
    }
    if (publicApiPaths.length > 0) {
      reasons.push(
        `${String(publicApiPaths.length)} public-API surface${publicApiPaths.length === 1 ? '' : 's'} — verify call sites haven't broken`,
      );
    }
    if (ownFindings.length > 0) {
      const blockers = ownFindings.filter((f) => f.severity === 'blocker').length;
      const highs = ownFindings.filter((f) => f.severity === 'high').length;
      if (blockers > 0) reasons.push(`Triage ${String(blockers)} blocker${blockers === 1 ? '' : 's'} on owned files`);
      else if (highs > 0) reasons.push(`Triage ${String(highs)} high-severity finding${highs === 1 ? '' : 's'} on owned files`);
      else reasons.push(`${String(ownFindings.length)} engine finding${ownFindings.length === 1 ? '' : 's'} on owned files`);
    } else if (fallback.length > 0) {
      reasons.push(`Generalist sweep — ${String(fallback.length)} top-severity finding${fallback.length === 1 ? '' : 's'} no specific owner`);
    }

    out.push({
      login: r.login,
      state: r.state,
      ownedPaths,
      findings: myFindings,
      publicApiPaths,
      reasons,
    });
  }
  // Sort by ownership coverage descending — biggest scope first.
  out.sort((a, b) => (b.ownedPaths.length + b.findings.length) - (a.ownedPaths.length + a.findings.length));
  return out;
}

function shortPath(p: string): string {
  return p.split('/').pop() ?? p;
}
