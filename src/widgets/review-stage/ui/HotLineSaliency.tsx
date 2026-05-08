// ─────────────────────────────────────────────────────────────────────────
// HotLineSaliency — file-level "skyline" of where the changes are.
//
// A 1D heatmap per file: the file is sliced into N buckets along its
// new-side line range, and each bucket's bar height = density of
// added+removed lines in that bucket. Lets a reviewer see "the change
// is concentrated in the last third of the file" without scrolling
// through the diff.
//
// Why it's not just sparkline-shaped:
//
//   • Tufte (1983) on micro/macro readings: the skyline shape encodes
//     the *macro* (where the change clusters) while the colour gradient
//     encodes the *micro* (how dense each cluster is).
//   • GitHub's 2024 Code Search redesign uses the same affordance for
//     "where in this file is your hit?" — proven scan-time gain over
//     scroll-to-hit reading.
//   • Cohen (2006) on review fatigue: defect-find rate plummets past
//     ~400 LOC. Surfacing change-shape lets the reviewer skip files
//     where the change is small/isolated.
//
// Aggregation: top 6 most-changed files. Past that the card stops
// being a glance.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Mountain } from 'lucide-react';
import type { FileDiff, PullRequest } from '@entities/pr';
import V2Card from './V2Card';

const BUCKET_COUNT = 28;
const BAR_HEIGHT_PX = 26;

type Bucket = { added: number; removed: number };

type FileSkyline = {
  path: string;
  buckets: Bucket[];
  rangeStart: number;
  rangeEnd: number;
  total: number;
  hottestBucket: number;
  scatter: number; // 0..1 — how spread-out the change is (entropy)
};

function buildSkyline(f: FileDiff): FileSkyline | null {
  if (f.hunks.length === 0) return null;
  let minLine = Infinity;
  let maxLine = -Infinity;
  for (const h of f.hunks) {
    let n = h.newStart;
    for (const ln of h.lines) {
      if (ln.kind !== 'del') {
        if (n < minLine) minLine = n;
        if (n > maxLine) maxLine = n;
        n += 1;
      }
    }
  }
  if (!Number.isFinite(minLine) || !Number.isFinite(maxLine)) return null;
  const range = Math.max(1, maxLine - minLine + 1);
  const buckets: Bucket[] = Array.from({ length: BUCKET_COUNT }, () => ({ added: 0, removed: 0 }));

  for (const h of f.hunks) {
    let newL = h.newStart;
    for (const ln of h.lines) {
      if (ln.kind === 'add') {
        const idx = Math.min(BUCKET_COUNT - 1, Math.floor(((newL - minLine) / range) * BUCKET_COUNT));
        buckets[idx].added += 1;
        newL += 1;
      } else if (ln.kind === 'del') {
        // Map deletions onto the new-side approximation so the skyline
        // stays unified — adopt the same bucket the next add would land in.
        const idx = Math.min(BUCKET_COUNT - 1, Math.floor(((Math.max(minLine, newL) - minLine) / range) * BUCKET_COUNT));
        buckets[idx].removed += 1;
      } else {
        newL += 1;
      }
    }
  }
  const total = buckets.reduce((acc, b) => acc + b.added + b.removed, 0);
  if (total === 0) return null;
  let hottestBucket = 0;
  let hottestVal = -1;
  for (let i = 0; i < BUCKET_COUNT; i++) {
    const v = buckets[i].added + buckets[i].removed;
    if (v > hottestVal) { hottestVal = v; hottestBucket = i; }
  }
  // Shannon entropy on bucket distribution → 0 (one spike) ... 1 (uniform).
  let entropy = 0;
  const denom = Math.log(BUCKET_COUNT);
  for (const b of buckets) {
    const p = (b.added + b.removed) / total;
    if (p > 0) entropy -= p * Math.log(p);
  }
  const scatter = denom > 0 ? entropy / denom : 0;

  return {
    path: f.path,
    buckets,
    rangeStart: minLine,
    rangeEnd: maxLine,
    total,
    hottestBucket,
    scatter,
  };
}

export default function HotLineSaliency({ pr }: { pr: PullRequest }) {
  const skylines = useMemo<FileSkyline[]>(() => {
    const ranked = [...pr.files].sort((a, b) => (b.added + b.removed) - (a.added + a.removed));
    const out: FileSkyline[] = [];
    for (const f of ranked) {
      if (out.length >= 6) break;
      const s = buildSkyline(f);
      if (s !== null) out.push(s);
    }
    return out;
  }, [pr]);

  if (skylines.length === 0) return null;

  // Global max for cross-file scale — keeps relative bar heights
  // comparable. Without it, a small file with 5 LOC in one bucket
  // looks as "tall" as a hot bucket from a 200 LOC change elsewhere.
  const globalMax = Math.max(
    ...skylines.flatMap((s) => s.buckets.map((b) => b.added + b.removed)),
  );

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Mountain className="w-3.5 h-3.5 text-white/55" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          Change saliency
        </span>
        <span className="text-[10px] font-mono text-white/40">
          {skylines.length} {skylines.length === 1 ? 'file' : 'files'} · density per line range
        </span>
      </div>

      <div className="space-y-2">
        {skylines.map((s) => {
          // Concentration tone: tight (low scatter) = focused = read first;
          // wide scatter = spread changes = harder to review.
          const focusTone = s.scatter < 0.4
            ? '#5fa86c'  // focused
            : s.scatter < 0.65
              ? '#a8893a'  // mixed
              : '#c25a55'; // scattered
          const focusLabel = s.scatter < 0.4 ? 'focused'
            : s.scatter < 0.65 ? 'mixed' : 'scattered';
          return (
            <div
              key={s.path}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-white/80 truncate" title={s.path}>
                    {s.path}
                  </span>
                  <span
                    className="shrink-0 inline-flex px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      background: `${focusTone}22`,
                      color: focusTone,
                      border: `1px solid ${focusTone}45`,
                    }}
                  >
                    {focusLabel}
                  </span>
                  <span className="text-[10px] font-mono text-white/35 ml-auto tabular-nums">
                    L{s.rangeStart}–{s.rangeEnd}
                  </span>
                </div>
                <div
                  className="flex items-end gap-px"
                  style={{ height: BAR_HEIGHT_PX }}
                  role="img"
                  aria-label={`Change density across ${s.path}, ${focusLabel}`}
                >
                  {s.buckets.map((b, i) => {
                    const v = b.added + b.removed;
                    const h = globalMax > 0 ? Math.max(1, Math.round((v / globalMax) * BAR_HEIGHT_PX)) : 1;
                    const isHot = i === s.hottestBucket && v > 0;
                    // Two-tone bar: bottom slice = removed (rose),
                    // top slice = added (emerald). Stacked bar so a
                    // bucket's net direction is visually obvious.
                    const addedSlice = v > 0 ? Math.round((b.added / v) * h) : 0;
                    const removedSlice = h - addedSlice;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col-reverse"
                        style={{ height: h }}
                        title={`${String(b.added)} added · ${String(b.removed)} removed`}
                      >
                        {addedSlice > 0 && (
                          <div
                            style={{
                              height: addedSlice,
                              background: isHot ? '#7fc78f' : '#5fa86c',
                              opacity: v === 0 ? 0.15 : 1,
                            }}
                          />
                        )}
                        {removedSlice > 0 && (
                          <div
                            style={{
                              height: removedSlice,
                              background: isHot ? '#e88a85' : '#c25a55',
                              opacity: v === 0 ? 0.15 : 1,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <div className="text-[14px] font-bold text-white/85 leading-none">{s.total}</div>
                <div className="text-[9px] font-mono text-white/35 mt-1 uppercase tracking-[0.10em]">lines</div>
              </div>
            </div>
          );
        })}
      </div>
    </V2Card>
  );
}
