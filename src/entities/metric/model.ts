// Metric domain types — separated from the lib/ implementations so other
// slices can depend on the shapes without pulling in the full aggregate
// machinery (which has heavy imports from @entities/repo).

// ─── Verdict (Spec §10 — Admission / Change Readiness) ──
// Verdict carries presentation-agnostic data so the UI layer is responsible
// for translation. `key` selects the message; `params` feeds ICU-style
// interpolation (e.g. {{vulnerable}} files); `tone` drives palette only.
export type VerdictKey =
  | 'shipReady'
  | 'reviewNeeded'         // generic warn fallback
  | 'highHumanReview'      // too many off-limits-to-agents files
  | 'verificationGap'      // too many files lack co-located tests
  | 'staleIndex'           // analysis index partially stale
  | 'criticalBlock'        // vulnerable files
  | 'noData';

export type VerdictTone = 'ok' | 'warn' | 'critical' | 'info';

export type Verdict = {
  tone: VerdictTone;
  key: VerdictKey;
  params?: {
    vulnerable?: number;
    humanOnly?: number;
    humanOnlyPct?: number;
    untested?: number;
    staleIndex?: number;
  };
};

// ─── Heat overlay metric keys ──
// Identifies which "heat" projection the renderer paints around each file.
// Defined here (rather than in lib/heat.ts) so consumers can refer to the
// key union without depending on the metric definitions themselves.
export type HeatMetricKey =
  | 'none'
  | 'hotspot'
  | 'time-hotspot'
  | 'complexity'
  | 'blast'
  | 'churn'
  | 'vulnerability'
  | 'aiRisk'
  | 'coverageGap'
  | 'stale'
  | 'unknown'
  | 'cycles';
