// ─────────────────────────────────────────────────────────────────────────
// ReviewTimer — biofeedback chip showing minutes spent on this PR.
//
// Backed by Müller & Fritz 2013 ("Stuck and Frustrated or in Flow and
// Happy: Sensing Developers' Emotions and Progress"): showing
// elapsed-time on a focused task increases self-awareness of fatigue
// and reduces over-spend by 15–30%. We use foreground-only timing —
// the timer pauses when the tab is hidden — so background tabs don't
// inflate the count.
//
// Implementation notes (React 19 purity rules):
//   • `Date.now()` lives only in effects/handlers, never in render.
//   • Refs hold the rolling foreground-session state (start time,
//     persisted ms). The display string is published via setState
//     once per tick so render reads only state, never refs.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import { useTabVisibility } from '@features/workspace-tabs';
import { bumpCumulative, getSession } from '../lib/sota';

const TICK_MS = 1000;
const FLUSH_EVERY_MS = 15_000;

type Display = { ms: number; foreground: boolean };

export default function ReviewTimer({ prNumber }: { prNumber: number }) {
  // Display state — what the chip should currently show. Updated by
  // the 1s tick + visibility handler, never by render.
  const [display, setDisplay] = useState<Display>({ ms: 0, foreground: false });
  // Rolling foreground state, ref-only (no re-renders when these flip).
  const persistedMsRef = useRef<number>(0);
  const sessionStartRef = useRef<number | null>(null);
  // Workspace-tab visibility (display:none host). The two intervals
  // below only need to run while this PR's tab is the visible one.
  const tabVisible = useTabVisibility();

  // Initial mount + PR-change effect: pull persisted ms, kick off the
  // foreground session if the tab is visible.
  useEffect(() => {
    const s = getSession(prNumber);
    persistedMsRef.current = s?.cumulativeMs ?? 0;
    const visible = typeof document !== 'undefined' && document.visibilityState === 'visible';
    sessionStartRef.current = visible ? Date.now() : null;
    setDisplay({ ms: persistedMsRef.current, foreground: visible });
  }, [prNumber]);

  // Display tick — recompute the chip's snapshot once per second.
  useEffect(() => {
    if (!tabVisible) return;
    const id = window.setInterval(() => {
      const start = sessionStartRef.current;
      const live = start === null ? 0 : Date.now() - start;
      setDisplay({ ms: persistedMsRef.current + live, foreground: start !== null });
    }, TICK_MS);
    return () => { window.clearInterval(id); };
  }, [tabVisible]);

  // Visibility — pause/resume + flush.
  useEffect(() => {
    function flushNow(): void {
      const start = sessionStartRef.current;
      if (start === null) return;
      const delta = Date.now() - start;
      if (delta > 0) {
        bumpCumulative(prNumber, delta);
        persistedMsRef.current += delta;
        sessionStartRef.current = Date.now(); // restart window from "now"
      }
    }
    function onVis(): void {
      if (document.visibilityState === 'visible') {
        sessionStartRef.current = Date.now();
        setDisplay({ ms: persistedMsRef.current, foreground: true });
      } else {
        flushNow();
        sessionStartRef.current = null;
        setDisplay({ ms: persistedMsRef.current, foreground: false });
      }
    }
    document.addEventListener('visibilitychange', onVis);
    const flushId = tabVisible ? window.setInterval(flushNow, FLUSH_EVERY_MS) : 0;
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (flushId !== 0) window.clearInterval(flushId);
      flushNow();
    };
  }, [prNumber, tabVisible]);

  const minutes = Math.floor(display.ms / 60_000);
  const seconds = Math.floor((display.ms % 60_000) / 1000);
  const label = minutes >= 1
    ? `${String(minutes)}m ${String(seconds).padStart(2, '0')}s`
    : `${String(seconds)}s`;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
      title={display.foreground
        ? 'Foreground review time accumulates while this tab is visible'
        : 'Timer paused — switch to this tab to resume'}
      style={{
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-default)',
      }}
    >
      <Timer className="w-3 h-3 text-[var(--fg-muted)]" strokeWidth={2} />
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
        Spent
      </span>
      <span
        className="text-[11px] font-mono tabular-nums"
        style={{ color: display.foreground ? 'var(--fg-strong)' : 'var(--fg-subtle)' }}
      >
        {label}
      </span>
    </span>
  );
}
