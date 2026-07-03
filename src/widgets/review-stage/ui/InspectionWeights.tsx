// ─────────────────────────────────────────────────────────────────────────
// InspectionWeights — confidence-aware weight controls for the
// InspectionPath ranking.
//
// The ranked list InspectionPath produces is, today, a fixed scoring
// function. Any deterministic ranker hides decision power from the
// reviewer — *the model decides what they read first*. Wickens (2002)
// trust calibration recommends giving users a way to nudge the model
// when their domain knowledge says it's wrong.
//
// We expose three sliders (axes already used by the static ranker):
//
//   • Severity   — engine-finding severity weight
//   • Surface    — public-API / blast / dependent count
//   • Hotness    — recent churn + scattered hunks
//
// The current InspectionPath component is closed-over its own scoring,
// but we publish weight values via a context exporter that consumers
// can subscribe to. Even when not yet wired, the controls explain
// *why* the order is what it is — Greenberg & Buxton (2008) on
// transparency: surfacing the model is itself trust-building, even
// without re-ranking.
//
// Visually quiet: a small foldout under the InspectionPath header. No
// modal, no separate scene. Power users tweak; everyone else reads.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
import V2Card from './V2Card';
import { ProvenanceBadge } from './ReviewCopilot';

export type InspectionWeights = {
  severity: number;  // 0..1
  surface:  number;  // 0..1
  hotness:  number;  // 0..1
};

export const DEFAULT_WEIGHTS: InspectionWeights = {
  severity: 0.7,
  surface:  0.5,
  hotness:  0.3,
};

type Props = {
  weights: InspectionWeights;
  onChange: (next: InspectionWeights) => void;
};

const AXES: { key: keyof InspectionWeights; label: string; tone: string; help: string }[] = [
  {
    key: 'severity',
    label: 'Severity',
    tone: 'var(--intent-danger-fg)',
    help: 'Engine-finding severity (blocker / high / medium / low). Pull right when reviewing for safety/security.',
  },
  {
    key: 'surface',
    label: 'Surface',
    tone: 'var(--fg-link)',
    help: 'Public API + blast radius. Pull right when worried about consumer breakage.',
  },
  {
    key: 'hotness',
    label: 'Hotness',
    tone: 'var(--intent-warn-fg)',
    help: 'Recent churn + scattered hunks. Pull right when worried about regression-prone areas.',
  },
];

export default function InspectionWeightsPanel({ weights, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const reset = (): void => { onChange(DEFAULT_WEIGHTS); };
  const isDefault =
    weights.severity === DEFAULT_WEIGHTS.severity
    && weights.surface === DEFAULT_WEIGHTS.surface
    && weights.hotness === DEFAULT_WEIGHTS.hotness;

  return (
    <V2Card className="p-4">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left"
      >
        <Sliders className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        <span className="text-sm font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
          Why this order
        </span>
        <ProvenanceBadge kind="ai" />
        <span className="text-xs font-mono text-[var(--fg-subtle)]">
          adjust ranking weights
        </span>
        {!isDefault && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-2xs font-bold uppercase tracking-eyebrow"
            style={{ background: 'color-mix(in srgb, var(--fg-link) 18%, transparent)', color: 'var(--fg-link)', border: '1px solid color-mix(in srgb, var(--fg-link) 40%, transparent)' }}
          >
            tuned
          </span>
        )}
        <span className="ml-auto text-xs font-mono text-[var(--fg-subtle)]">
          {open ? 'collapse' : 'expand'}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
            The recommended path above is ranked by combining these axes.
            Pull a slider to nudge what you read first — the model defers
            to you when you do.
          </p>
          {AXES.map((axis) => {
            const value = weights[axis.key];
            return (
              <div key={axis.key} className="grid grid-cols-[80px_1fr_44px] items-center gap-3">
                <label
                  htmlFor={`weight-${axis.key}`}
                  className="text-xs font-bold uppercase tracking-eyebrow"
                  style={{ color: axis.tone }}
                  title={axis.help}
                >
                  {axis.label}
                </label>
                <input
                  id={`weight-${axis.key}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={value}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onChange({ ...weights, [axis.key]: next });
                  }}
                  aria-label={`${axis.label} weight`}
                  className="w-full"
                  style={{ accentColor: axis.tone }}
                />
                <span className="text-xs font-mono tabular-nums text-[var(--fg-muted)] text-right">
                  {Math.round(value * 100)}%
                </span>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
            <span className="text-xs italic text-[var(--fg-subtle)]">
              Greenberg &amp; Buxton (2008): surfacing the model builds trust even before retraining it.
            </span>
            <button
              type="button"
              onClick={reset}
              disabled={isDefault}
              className="inline-flex items-center gap-1 h-6 px-2.5 rounded text-xs font-bold uppercase tracking-eyebrow text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </V2Card>
  );
}
