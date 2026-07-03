import { TrendingUp, ArrowUpRight } from 'lucide-react';
import type { OverridePattern } from './overridePatterns';

// Pattern banner (Gate §F). When the same rule keeps getting overridden in
// the last 14d the rule itself is the suspect, not the authors. The
// banner makes that visible in the Gate page (where overrides happen) and
// links to Calibration (where precision is judged).
//
// Deliberately *not* an alert — fg-muted with a subtle accent. Authors
// shouldn't feel accused for using a feature we shipped.

export function PatternBanner({
  patterns, onJumpToCalibration,
}: {
  patterns: OverridePattern[];
  onJumpToCalibration: (ruleId: string) => void;
}) {
  if (patterns.length === 0) return null;
  return (
    <div
      className="rounded-md p-3 flex flex-col gap-2"
      style={{
        background: 'color-mix(in oklab, var(--intent-warn-fg) 6%, var(--bg-canvas))',
        border: '1px solid color-mix(in oklab, var(--intent-warn-fg) 25%, transparent)',
      }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: 'var(--intent-warn-fg)' }}
        />
        <span
          className="text-sm uppercase tracking-eyebrow font-semibold"
          style={{ color: 'var(--intent-warn-fg)' }}
        >
          Override pattern
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          rules being bypassed repeatedly — the rule may be the problem
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {patterns.slice(0, 4).map((p) => {
          const total = p.overrideCount + p.suppressionCount;
          return (
            <li
              key={p.ruleId}
              className="flex items-center gap-2 text-sm"
            >
              <span className="font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                {p.ruleName}
              </span>
              <span
                className="text-xs font-mono shrink-0"
                style={{ color: 'var(--fg-muted)' }}
                title={`${String(p.overrideCount)} overrides + ${String(p.suppressionCount)} suppressions, by ${String(p.distinctActors)} different ${p.distinctActors === 1 ? 'author' : 'authors'} in 14d`}
              >
                {total}× in 14d · {p.distinctActors} {p.distinctActors === 1 ? 'author' : 'authors'}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => { onJumpToCalibration(p.ruleId); }}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: 'var(--fg-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-strong)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
              >
                Inspect in Calibration
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
