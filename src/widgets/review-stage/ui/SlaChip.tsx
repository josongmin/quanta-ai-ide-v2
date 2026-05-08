// ─────────────────────────────────────────────────────────────────────────
// SLA chip — glanceable "how long has this been waiting?" indicator on
// queue rows. Bucketed against DORA review-latency cohorts (see
// insights2026.ts) so the colour and copy track elite/high/low cohort
// expectations rather than arbitrary hour counts.
//
// Design choice: the chip carries tone via *colour of the text only*, not
// background fill or a left stripe. Project rule forbids accent stripes
// on rows; muted text-only chips also stay legible against the row hover
// tint without competing with the risk-tier dot above it.
// ─────────────────────────────────────────────────────────────────────────

import { Clock } from 'lucide-react';
import type { SlaInfo } from '../lib/insights2026';
import { OK, SEV } from '../lib/tones';

export default function SlaChip({ sla, dense = false }: { sla: SlaInfo; dense?: boolean }) {
  // Fresh PRs don't deserve a chip — only show when the signal is meaningful.
  if (sla.bucket === 'fresh') return null;

  const color = sla.tone === 'block' ? SEV.blocker
    : sla.tone === 'warn' ? SEV.medium
    : OK;

  const reasonCopy =
    sla.bucket === 'stale'   ? 'past 3d SLA'
    : sla.bucket === 'aging' ? 'past 1d SLA'
    : 'within SLA';

  return (
    <span
      className="inline-flex items-center gap-1 font-mono tabular-nums"
      style={{ color, fontSize: dense ? 10 : 11 }}
      title={`Idle for ${sla.label} · ${reasonCopy}`}
    >
      <Clock className="w-2.5 h-2.5" strokeWidth={2.25} />
      {sla.label}
    </span>
  );
}
