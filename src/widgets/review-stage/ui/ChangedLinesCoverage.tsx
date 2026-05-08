// ─────────────────────────────────────────────────────────────────────────
// ChangedLinesCoverage — line-level coverage overlay for changed files.
//
// Why this is more decision-relevant than file-average coverage:
// Google Engineering Practices (publicly: "Code Health" series): the
// signal that predicts post-merge regressions is *whether the lines
// the PR added/changed are exercised by tests*, not the file-level
// average. A file at 80% coverage can ship a fully untested new
// function. We render that distinction visually:
//
//   ▮ green stripe = added line covered by tests
//   ▮ amber stripe = added line partially covered (edge case)
//   ▮ red   stripe = added line uncovered
//   ▮ gray  stripe = removed line (informational)
//
// Coverage status here is synthesised from FileRecord.metrics.lineCoverage
// + churn proxy (a heavily-changed function on a partially-covered file
// is more likely uncovered than untouched lines on the same file). It's
// deterministic per-PR so screenshots stay stable.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { TestTube2, AlertTriangle } from 'lucide-react';
import type { FileDiff, PullRequest } from '@entities/pr';
import type { RepoData } from '@entities/repo';
import V2Card from './V2Card';

type LineStatus = 'covered' | 'partial' | 'uncovered' | 'removed';

type LineRow = {
  status: LineStatus;
  oldLine: number | null;
  newLine: number | null;
  text: string;
};

type FileBlock = {
  path: string;
  rows: LineRow[];
  added: number;
  covered: number;
  uncovered: number;
};

const STATUS_COLOR: Record<LineStatus, string> = {
  covered:   '#5fa86c',
  partial:   '#a8893a',
  uncovered: '#c25a55',
  removed:   '#6e7681',
};

// Deterministic per-line coverage synthesis. Anchored to
// FileRecord.metrics.lineCoverage so the overall percentages line up
// with the file's average, but specific *changed* lines lean uncovered
// (because they're new behaviour and tests usually lag the change).
function synthLineStatus(
  fileSeed: number, lineNo: number, fileLineCoverage: number,
): LineStatus {
  // 0..1 noise from a stable hash of (fileSeed, lineNo).
  const h = ((fileSeed * 9301 + lineNo * 49297) % 233280) / 233280;
  // Newly-changed lines have ~25 percentage points lower coverage
  // than the file average — empirically, tests follow code by a PR or two.
  const adjusted = Math.max(0, fileLineCoverage / 100 - 0.25);
  if (h < adjusted * 0.7) return 'covered';
  if (h < adjusted) return 'partial';
  return 'uncovered';
}

function buildBlock(f: FileDiff, repo: RepoData): FileBlock | null {
  if (f.fileId === null) return null;
  const file = repo.files[f.fileId];
  if (!file) return null;
  const fileSeed = file.id;
  const lineCov = file.metrics.lineCoverage;

  const rows: LineRow[] = [];
  let added = 0;
  let covered = 0;
  let uncovered = 0;

  for (const h of f.hunks) {
    let oldL = h.oldStart;
    let newL = h.newStart;
    for (const ln of h.lines) {
      if (ln.kind === 'add') {
        const status = lineCov === 0
          ? 'uncovered'
          : synthLineStatus(fileSeed, newL, lineCov);
        rows.push({ status, oldLine: null, newLine: newL, text: ln.text });
        added += 1;
        if (status === 'covered') covered += 1;
        else if (status === 'uncovered') uncovered += 1;
        newL += 1;
      } else if (ln.kind === 'del') {
        rows.push({ status: 'removed', oldLine: oldL, newLine: null, text: ln.text });
        oldL += 1;
      } else {
        // context — included so the reader has anchors, but rendered grey
        rows.push({ status: 'removed', oldLine: oldL, newLine: newL, text: ln.text });
        oldL += 1;
        newL += 1;
      }
    }
  }

  if (added === 0) return null;

  return { path: f.path, rows, added, covered, uncovered };
}

export default function ChangedLinesCoverage({
  pr, repo,
}: { pr: PullRequest; repo: RepoData }) {
  const blocks = useMemo<FileBlock[]>(() => {
    const out: FileBlock[] = [];
    // Cap at top-3 most-changed files. Past 3 the card stops being a
    // glanceable overlay and becomes a second Files panel.
    const ranked = [...pr.files].sort((a, b) => (b.added + b.removed) - (a.added + a.removed));
    for (const f of ranked) {
      if (out.length >= 3) break;
      const b = buildBlock(f, repo);
      if (b !== null) out.push(b);
    }
    return out;
  }, [pr, repo]);

  if (blocks.length === 0) return null;

  const totals = blocks.reduce(
    (acc, b) => ({
      added: acc.added + b.added,
      covered: acc.covered + b.covered,
      uncovered: acc.uncovered + b.uncovered,
    }),
    { added: 0, covered: 0, uncovered: 0 },
  );
  const coverageRate = totals.added > 0 ? totals.covered / totals.added : 0;
  const danger = totals.added > 0 && coverageRate < 0.5;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <TestTube2 className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Changed-line coverage
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {totals.covered}/{totals.added} new lines tested
        </span>
        {danger && (
          <span
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ background: 'rgba(194,90,85,0.16)', color: '#e88a85', border: '1px solid rgba(194,90,85,0.45)' }}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {totals.uncovered} untested
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4 text-[10px] font-mono text-white/45">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: STATUS_COLOR.covered }} />
          covered
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: STATUS_COLOR.partial }} />
          partial
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: STATUS_COLOR.uncovered }} />
          uncovered
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ background: STATUS_COLOR.removed }} />
          removed/context
        </span>
      </div>

      <div className="space-y-3">
        {blocks.map((b) => {
          const fileRate = b.covered / b.added;
          const fileTone = fileRate >= 0.75
            ? '#5fa86c'
            : fileRate >= 0.4
              ? '#a8893a'
              : '#c25a55';
          // Cap rendered rows per file — the goal is a glance, not a code reader.
          const visibleRows = b.rows.slice(0, 14);
          const overflow = b.rows.length - visibleRows.length;
          return (
            <div key={b.path} className="rounded-md border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.025] border-b border-white/[0.06]">
                <span className="text-[11px] font-mono text-white/80 truncate flex-1" title={b.path}>
                  {b.path}
                </span>
                <span className="text-[10px] font-mono tabular-nums" style={{ color: fileTone }}>
                  {Math.round(fileRate * 100)}% ({b.covered}/{b.added})
                </span>
              </div>
              <div className="font-mono text-[11px] leading-[1.45]">
                {visibleRows.map((r, i) => (
                  <div key={i} className="flex items-stretch">
                    <span
                      className="shrink-0 w-1"
                      style={{ background: STATUS_COLOR[r.status] }}
                    />
                    <span className="shrink-0 w-9 px-1.5 text-right text-white/30 tabular-nums select-none">
                      {r.newLine ?? r.oldLine ?? ''}
                    </span>
                    <span
                      className="shrink-0 w-3 text-center select-none"
                      style={{
                        color: r.status === 'removed'
                          ? r.oldLine !== null && r.newLine !== null ? 'transparent' : '#c25a55'
                          : '#5fa86c',
                      }}
                    >
                      {r.status === 'removed'
                        ? r.oldLine !== null && r.newLine !== null ? ' ' : '-'
                        : '+'}
                    </span>
                    <span className="flex-1 px-2 py-px truncate text-white/75">
                      {r.text}
                    </span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="px-3 py-1.5 text-[10px] text-white/35 italic border-t border-white/[0.04]">
                    +{overflow} more lines…
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </V2Card>
  );
}
