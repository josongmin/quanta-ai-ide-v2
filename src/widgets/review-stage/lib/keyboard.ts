import { useEffect, useRef } from 'react';
import type { ReviewTabKey } from '../ReviewStage';

// Two-key chord timeout ("g o" → Overview). 1.2s mirrors common Vim-bindings
// in browser apps (gmail, linear). Long enough that humans can hit it; short
// enough that a stray "g" doesn't swallow the next keypress forever.
const CHORD_TIMEOUT_MS = 1200;

export type ReviewKeyboardArgs = {
  /** Numbers of PRs in the rail's current visible order. Used by `j/k`.
      Passed as a ref so the listener always reads the latest list (the rail
      writes to the ref via an effect during its own render cycle). */
  visiblePrNumbersRef: { current: number[] };
  /** Currently selected PR number, or null when nothing is selected. */
  activePrNumber: number | null;
  setActivePrNumber: (n: number) => void;

  /** Ordered file paths for the active PR. Used by `n/p` and `v`. */
  visibleFilePaths: string[];
  /** Currently selected file path, or null when none. */
  activeFilePath: string | null;
  setActiveFilePath: (path: string) => void;

  /** Tab control. */
  tab: ReviewTabKey;
  setTab: (t: ReviewTabKey) => void;

  /** Toggle "viewed" for the current file (Files tab only). */
  onToggleViewed: () => void;
  /** Focus the activity-tab review composer; the hook handles the
      tab switch when needed. */
  onFocusReviewComposer: () => void;
  /** Submit Approve / Request-changes verdicts on the active PR. Called
      with no args; the parent decides which review payload to send. */
  onApprove?: () => void;
  onRequestChanges?: () => void;

  /** Cheat-sheet toggle (the `?` key). */
  toggleCheatSheet: () => void;

  /** Master switch — disabled when an input/textarea owns focus. */
  enabled: boolean;
};

const TAB_CHORD: Record<string, ReviewTabKey> = {
  o: 'overview',
  f: 'files',
  r: 'risk',
  c: 'checks',
  a: 'activity',
};

/** Returns true when a typing surface owns focus and we should bail. */
function inEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Keyboard map for the review surface. All bindings are global (window-level)
 * but skipped while the user is typing into an input/textarea, so the
 * composer keeps default behavior. The hook is intentionally state-free
 * about *what* is visible — that's all passed in as args so the widget
 * stays the source of truth.
 */
export function useReviewKeyboard(args: ReviewKeyboardArgs): void {
  // Refs so the listener doesn't re-bind on every render. The args ref is
  // refreshed in an effect so we never write a ref during render (which
  // confuses React's concurrent renderer).
  const ref = useRef(args);
  useEffect(() => {
    ref.current = args;
  });

  // `g` chord state — we wait for the next key. If it doesn't arrive in
  // time we drop the chord. Stored in a ref (not state) so re-renders
  // don't reset the timer.
  const chordTimer = useRef<number | null>(null);
  const chordActive = useRef(false);

  useEffect(() => {
    function clearChord() {
      if (chordTimer.current !== null) {
        window.clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
      chordActive.current = false;
    }

    function onKey(e: KeyboardEvent) {
      const a = ref.current;
      if (!a.enabled) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (inEditableTarget(e.target)) return;

      const key = e.key;

      // Chord follow-up.
      if (chordActive.current) {
        const t = TAB_CHORD[key.toLowerCase()];
        if (t !== undefined) {
          e.preventDefault();
          a.setTab(t);
        }
        clearChord();
        return;
      }

      // Chord opener.
      if (key === 'g') {
        chordActive.current = true;
        chordTimer.current = window.setTimeout(clearChord, CHORD_TIMEOUT_MS);
        return;
      }

      if (key === '?') {
        e.preventDefault();
        a.toggleCheatSheet();
        return;
      }

      if (key === 'j' || key === 'k') {
        const visible = a.visiblePrNumbersRef.current;
        if (visible.length === 0) return;
        const idx = a.activePrNumber === null
          ? -1
          : visible.indexOf(a.activePrNumber);
        const delta = key === 'j' ? 1 : -1;
        const nextIdx = clamp(idx + delta, 0, visible.length - 1);
        const next = visible[nextIdx];
        if (next !== undefined && next !== a.activePrNumber) {
          e.preventDefault();
          a.setActivePrNumber(next);
        }
        return;
      }

      if (key === 'n' || key === 'p') {
        if (a.tab !== 'files') return;
        if (a.visibleFilePaths.length === 0) return;
        const idx = a.activeFilePath === null
          ? -1
          : a.visibleFilePaths.indexOf(a.activeFilePath);
        const delta = key === 'n' ? 1 : -1;
        const nextIdx = clamp(idx + delta, 0, a.visibleFilePaths.length - 1);
        const next = a.visibleFilePaths[nextIdx];
        if (next !== undefined && next !== a.activeFilePath) {
          e.preventDefault();
          a.setActiveFilePath(next);
        }
        return;
      }

      if (key === 'v') {
        if (a.tab !== 'files') return;
        if (a.activeFilePath === null) return;
        e.preventDefault();
        a.onToggleViewed();
        return;
      }

      if (key === 'r') {
        e.preventDefault();
        if (a.tab !== 'activity') a.setTab('activity');
        // Defer focus until after the tab swap settles.
        window.setTimeout(() => { a.onFocusReviewComposer(); }, 0);
        return;
      }

      // Verdict shortcuts: GitHub-style "a" to approve, "x" to request
      // changes. Avoiding "y/n" because those collide with browser
      // confirm-dialog reflexes; "a/x" mirror the visual prominence of
      // the buttons in the hero stack.
      if (key === 'a') {
        if (a.onApprove === undefined) return;
        e.preventDefault();
        a.onApprove();
        return;
      }
      if (key === 'x') {
        if (a.onRequestChanges === undefined) return;
        e.preventDefault();
        a.onRequestChanges();
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearChord();
    };
    // The listener reads everything off `ref.current` and the ref-typed
    // `visiblePrNumbersRef` — both are mutable containers the parent
    // updates each render, so we install the listener exactly once.
  }, []);
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
