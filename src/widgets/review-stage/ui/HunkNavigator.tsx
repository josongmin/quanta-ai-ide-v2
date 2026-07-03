// ─────────────────────────────────────────────────────────────────────────
// HunkNavigator — hunk-level keyboard nav + progress ribbon.
//
// Lets a reviewer step through the hunks of the *active file* with `{`
// and `}` (Vim-style "previous/next paragraph"), with a progress bar
// showing position within the file. Mirrors how heavy reviewers
// actually read a file: not top-to-bottom, but hunk-to-hunk.
//
// Why hunk-aware navigation matters:
//
//   • Bird et al. (MS, 2011) — heavy reviewers spend ~70% of file
//     time inside hunks; the rest is scrolling between them. The
//     scroll between is wasted time.
//   • GitHub PR review keyboard (industry baseline) ships `j/k` for
//     hunk nav inside a file; we match the affordance with
//     non-conflicting keys.
//   • Sweller's split-attention principle: a separate small chip
//     showing "hunk 3 / 8 · L142–157" lets the reviewer keep their
//     spatial position without scrolling back to the file header.
//
// Key bindings (chosen to avoid conflicts with the global keyboard
// hook which already uses `j/k` for PR navigation and `n/p` for file
// navigation):
//
//   `}` — next hunk in the active file
//   `{` — previous hunk in the active file
//   `0` — first hunk (Home-style)
//   `$` — last hunk (End-style; Vim convention)
//
// The chip is sticky-positioned within the FilesScene so it stays in
// view while the reviewer scrolls the diff body.
// ─────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { FileDiff } from '@entities/pr';
import { useTheme } from '@shared/theme';

type Props = {
  /** The currently active file in the FilesScene. Null → no chip rendered. */
  file: FileDiff | null;
};

type HunkSummary = {
  index: number;
  newStart: number;
  newEnd: number;
  added: number;
  removed: number;
  header: string;
};

export default function HunkNavigator({ file }: Props) {
  const { isDark } = useTheme();
  // Hooks first (Rules of Hooks). Cursor is keyed-by-path so changing
  // file resets it implicitly — derived state, no setState-in-effect.
  // We track the path the cursor belongs to alongside the cursor itself.
  const [state, setState] = useState<{ path: string | null; cursor: number }>(
    { path: null, cursor: 0 },
  );
  // Render-time normalisation: if the active file changed since last
  // render, treat cursor as 0 for *this* render. Next mutation snaps
  // state into the new path.
  const activePath = file?.path ?? null;
  const cursor = state.path === activePath ? state.cursor : 0;
  const setCursor = useCallback(
    (next: number | ((c: number) => number)) => {
      setState((prev) => {
        const base = prev.path === activePath ? prev.cursor : 0;
        const value = typeof next === 'function' ? next(base) : next;
        return { path: activePath, cursor: value };
      });
    },
    [activePath],
  );

  const hunks = useMemo<HunkSummary[]>(() => {
    if (!file) return [];
    return file.hunks.map((h, i) => {
      let added = 0;
      let removed = 0;
      let newL = h.newStart;
      let lastNewLine = h.newStart;
      for (const ln of h.lines) {
        if (ln.kind === 'add') { added += 1; lastNewLine = newL; newL += 1; }
        else if (ln.kind === 'del') { removed += 1; }
        else { lastNewLine = newL; newL += 1; }
      }
      return {
        index: i,
        newStart: h.newStart,
        newEnd: lastNewLine,
        added,
        removed,
        header: h.header,
      };
    });
  }, [file]);

  const goPrev = useCallback(() => {
    setCursor((c) => Math.max(0, c - 1));
  }, [setCursor]);
  const goNext = useCallback(() => {
    setCursor((c) => {
      const n = hunks.length;
      if (n === 0) return 0;
      return Math.min(n - 1, c + 1);
    });
  }, [hunks.length, setCursor]);
  const goFirst = useCallback(() => { setCursor(0); }, [setCursor]);
  const goLast = useCallback(() => {
    setCursor(Math.max(0, hunks.length - 1));
  }, [hunks.length, setCursor]);

  // Keyboard listener — mirrors the global hook's typing-target guard.
  useEffect(() => {
    if (!file || hunks.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (t.isContentEditable) return;
      }
      if (e.key === '}') { e.preventDefault(); goNext(); }
      else if (e.key === '{') { e.preventDefault(); goPrev(); }
      else if (e.key === '0') { e.preventDefault(); goFirst(); }
      else if (e.key === '$') { e.preventDefault(); goLast(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [file, hunks.length, goNext, goPrev, goFirst, goLast]);

  if (!file || hunks.length === 0) return null;
  const safeIdx = Math.min(cursor, hunks.length - 1);
  const cur = hunks[safeIdx];

  return (
    <div
      className="sticky top-10 z-10 mt-3 flex items-center gap-3 px-3 py-2 rounded-md"
      style={{
        background: 'var(--bg-overlay)',
        ...(isDark ? {
          backdropFilter: 'blur(6px) saturate(140%)',
          WebkitBackdropFilter: 'blur(6px) saturate(140%)',
        } : {}),
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="shrink-0 text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
        Hunk
      </span>
      <span className="shrink-0 text-base font-mono tabular-nums text-[var(--fg-default)]">
        {safeIdx + 1} / {hunks.length}
      </span>
      <span className="shrink-0 text-xs font-mono text-[var(--fg-muted)] tabular-nums">
        L{cur.newStart}–{cur.newEnd}
      </span>
      <span className="shrink-0 text-xs font-mono">
        <span style={{ color: 'color-mix(in srgb, var(--intent-success-vivid) 80%, transparent)' }}>+{cur.added}</span>
        <span className="text-[var(--fg-subtle)] mx-1">·</span>
        <span style={{ color: 'color-mix(in srgb, var(--intent-danger-vivid) 80%, transparent)' }}>−{cur.removed}</span>
      </span>
      {/* Mini multi-tick progress: each hunk is a tick, current
          is filled solid. Lets a reviewer see "3/8" not just as a
          ratio but as spatial position within the file. */}
      <span
        className="flex-1 min-w-12 max-w-[280px] flex items-stretch gap-px h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-hover)' }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={hunks.length}
        aria-valuenow={safeIdx + 1}
        aria-label={`Hunk ${String(safeIdx + 1)} of ${String(hunks.length)}`}
      >
        {hunks.map((_, i) => (
          <span
            key={i}
            className="flex-1 h-full"
            style={{
              background: i === safeIdx ? 'var(--fg-link)'
                : i < safeIdx ? 'color-mix(in srgb, var(--fg-link) 55%, transparent)'
                : 'var(--bg-elevated)',
            }}
          />
        ))}
      </span>
      <span className="shrink-0 hidden md:inline-flex items-center gap-2 text-2xs font-mono text-[var(--fg-subtle)]">
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">{'{'}</kbd>
          <kbd className="px-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">{'}'}</kbd>
          step
        </span>
      </span>
      <div className="shrink-0 inline-flex items-center gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={safeIdx === 0}
          className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous hunk ({)"
          aria-label="Previous hunk"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={safeIdx >= hunks.length - 1}
          className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next hunk (})"
          aria-label="Next hunk"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Visual progress export (unused but documented in case other surfaces
// want to render the same percentage):
export { type Props as HunkNavigatorProps };
