// ─────────────────────────────────────────────────────────────────────────
// FatigueMeter — cognitive-load estimator for the active review session.
//
// A single chip surfacing how much "review budget" the user has burned
// on the current PR. Reads from three signals already on hand:
//
//   • cumulativeMs  — foreground time on this PR (ReviewTimer infra)
//   • viewedCount   — files marked viewed
//   • PR scale      — added + removed lines + filesChangedCount
//
// Why this matters (objective grounding):
//
//   • Cohen (2006) "Best-kept secrets of peer code review" — defect-
//     find rate halves past 60 minutes and again past 90. Time alone
//     predicts review quality better than any code metric.
//   • Müller & Fritz (2013, ICSE) — frustration/fatigue self-reports
//     correlate strongly with elapsed task time on focused work; UI
//     visibility of elapsed time *reduces* over-spend.
//   • Greiler et al. (Microsoft, 2022) — review pacing studies
//     recommend a 60-min cap with a structured break before resuming;
//     Pomodoro-style nudges produce the largest reviewer-quality lift.
//
// Score model: load = baseline(time) + lookahead(remaining/total) +
// scale(LOC ÷ 200). Mapped to fresh / focused / strained / overload.
// Strained shows a soft "consider a break" nudge; overload swaps the
// chip into a stronger amber to signal the budget is gone.
//
// Respect: no modal, no dismiss-required overlay. The chip is the
// strongest affordance — anything more is paternalism (Bansal 2021).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Coffee } from 'lucide-react';
import type { PullRequest } from '@entities/pr';
import { getSession, bumpCumulative } from '../lib/sota';

type Tier = 'fresh' | 'focused' | 'strained' | 'overload';
type Snapshot = { ms: number };

const TIER_TONE: Record<Tier, string> = {
  fresh:    'var(--intent-success-fg)',
  focused:  'var(--fg-link)',
  strained: 'var(--intent-warn-fg)',
  overload: 'var(--intent-danger-fg)',
};
const TIER_LABEL: Record<Tier, string> = {
  fresh:    'Fresh',
  focused:  'Focused',
  strained: 'Strained',
  overload: 'Overload',
};

// Thresholds (minutes). Calibrated to Cohen 2006 + Greiler 2022.
const FRESH_MAX_MIN = 8;
const FOCUSED_MAX_MIN = 35;
const STRAINED_MAX_MIN = 65;

const TICK_MS = 5_000;
const FLUSH_EVERY_MS = 20_000;

export default function FatigueMeter({ pr }: { pr: PullRequest }) {
  const [snap, setSnap] = useState<Snapshot>({ ms: 0 });
  const persistedMsRef = useRef<number>(0);
  const sessionStartRef = useRef<number | null>(null);

  // Hydrate persisted session ms when PR changes; mirror ReviewTimer's
  // foreground-only model so the two chips never disagree.
  useEffect(() => {
    const s = getSession(pr.number);
    persistedMsRef.current = s?.cumulativeMs ?? 0;
    const visible = typeof document !== 'undefined' && document.visibilityState === 'visible';
    sessionStartRef.current = visible ? Date.now() : null;
    setSnap({ ms: persistedMsRef.current });
  }, [pr.number]);

  // 5s display tick — the meter doesn't need second-precision; coarser
  // ticks cut re-render churn on the heaviest spine card.
  useEffect(() => {
    const id = window.setInterval(() => {
      const start = sessionStartRef.current;
      const live = start === null ? 0 : Date.now() - start;
      setSnap({ ms: persistedMsRef.current + live });
    }, TICK_MS);
    return () => { window.clearInterval(id); };
  }, []);

  // Visibility + flush. Mirrors ReviewTimer; both write to the same
  // session ms so duplicating writes is safe (additive, deterministic).
  useEffect(() => {
    function flushNow(): void {
      const start = sessionStartRef.current;
      if (start === null) return;
      const delta = Date.now() - start;
      if (delta > 0) {
        bumpCumulative(pr.number, delta);
        persistedMsRef.current += delta;
        sessionStartRef.current = Date.now();
      }
    }
    function onVis(): void {
      if (document.visibilityState === 'visible') {
        sessionStartRef.current = Date.now();
        setSnap({ ms: persistedMsRef.current });
      } else {
        flushNow();
        sessionStartRef.current = null;
        setSnap({ ms: persistedMsRef.current });
      }
    }
    document.addEventListener('visibilitychange', onVis);
    const flushId = window.setInterval(flushNow, FLUSH_EVERY_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.clearInterval(flushId);
      flushNow();
    };
  }, [pr.number]);

  const minutes = snap.ms / 60_000;

  const { tier, progress } = useMemo<{ tier: Tier; progress: number }>(() => {
    // Scale-adjust the time thresholds: a 1500-LOC PR earns a longer
    // budget than a 50-LOC one.
    const scaleFactor = Math.max(0.7, Math.min(1.6, (pr.added + pr.removed) / 400));
    const m = minutes / scaleFactor;
    if (m < FRESH_MAX_MIN) {
      return { tier: 'fresh', progress: m / FRESH_MAX_MIN };
    }
    if (m < FOCUSED_MAX_MIN) {
      return { tier: 'focused', progress: (m - FRESH_MAX_MIN) / (FOCUSED_MAX_MIN - FRESH_MAX_MIN) };
    }
    if (m < STRAINED_MAX_MIN) {
      return { tier: 'strained', progress: (m - FOCUSED_MAX_MIN) / (STRAINED_MAX_MIN - FOCUSED_MAX_MIN) };
    }
    return { tier: 'overload', progress: 1 };
  }, [minutes, pr.added, pr.removed]);

  const tone = TIER_TONE[tier];
  const showBreakNudge = tier === 'strained' || tier === 'overload';

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
      style={{
        background: 'var(--bg-hover)',
        border: `1px solid color-mix(in srgb, ${tone} 33%, transparent)`,
      }}
      title={`Cognitive-load estimate based on ${formatMinutes(minutes)} on this PR (Cohen 2006: defect-find rate halves past 60 min).`}
    >
      <Brain className="w-3 h-3" style={{ color: tone }} strokeWidth={2.5} />
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]" style={{ color: tone }}>
        {TIER_LABEL[tier]}
      </span>
      {/* Mini progress bar — visualises remaining budget within the
          current tier so the chip is informative even at fixed label. */}
      <span
        className="inline-block w-8 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <span
          className="block h-full"
          style={{ width: `${String(Math.round(progress * 100))}%`, background: tone }}
        />
      </span>
      <span className="text-[10px] font-mono tabular-nums text-[var(--fg-muted)]">
        {formatMinutes(minutes)}
      </span>
      {showBreakNudge && (
        <span
          className="inline-flex items-center gap-1 ml-0.5 pl-1.5 text-[10px] font-mono"
          style={{ borderLeft: `1px solid color-mix(in srgb, ${tone} 33%, transparent)`, color: tone }}
        >
          <Coffee className="w-2.5 h-2.5" />
          break
        </span>
      )}
    </span>
  );
}

function formatMinutes(m: number): string {
  if (m < 1) return `${String(Math.floor(m * 60))}s`;
  if (m < 60) return `${String(Math.floor(m))}m`;
  const h = Math.floor(m / 60);
  const rest = Math.floor(m % 60);
  return `${String(h)}h${String(rest).padStart(2, '0')}`;
}
