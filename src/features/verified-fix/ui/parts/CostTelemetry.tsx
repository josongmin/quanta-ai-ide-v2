import { Coins, Timer, TrendingUp } from 'lucide-react';
import type { FixCase } from '../../model/types';
import { useVfx } from './tokens';

// Cost telemetry strip — `acceptance_rate × value > cycles × cycle_cost`
// must be visible from Phase 1 so the loop's economics are measurable.
// Numbers are illustrative session-aggregates derived from the case.

export function CostTelemetry({ fixCase }: { fixCase: FixCase }) {
  const t = useVfx();
  const tokens = fixCase.loop.iterations.reduce((a, b) => a + b.costTokens, 0);
  const validateSec = fixCase.loop.iterations.reduce((a, b) => a + b.validationSeconds, 0);
  const llmDollars = (tokens / 1_000_000) * 18;        // assume $18/MTok
  const ciDollars  = (validateSec / 60) * 0.32;        // assume $0.32/min CI
  const cycleCost  = llmDollars + ciDollars;

  // demo "value" — what an accepted patch is worth (rough heuristic).
  const value = fixCase.draft?.gateDecision === 'auto-submit' ? 320
    : fixCase.draft?.gateDecision === 'needs-review' ? 180
    : 0;
  const profitable = value > cycleCost * 2;

  return (
    <div
      className="rounded-lg border px-4 py-2.5 flex items-center gap-3 flex-wrap"
      style={{ background: t.inset, borderColor: t.borderSoft }}
    >
      <span
        className="text-[10px] font-black uppercase tracking-[0.18em] shrink-0"
        style={{ color: t.textMuted }}
      >
        cost telemetry
      </span>

      <Cell icon={Coins} label="llm tokens" value={`${(tokens / 1000).toFixed(1)}k`} sub={`$${llmDollars.toFixed(2)}`} />
      <Cell icon={Timer} label="validation" value={`${validateSec.toFixed(0)}s`} sub={`$${ciDollars.toFixed(2)}`} />
      <Cell icon={Coins} label="cycle cost" value={`$${cycleCost.toFixed(2)}`} sub={`× ${fixCase.loop.iterations.length} iter`} />

      <div className="ml-auto flex items-center gap-2">
        <TrendingUp className="w-3 h-3" style={{ color: profitable ? t.ok : t.warn }} />
        <span
          className="text-[10px] font-mono"
          style={{ color: profitable ? t.ok : t.warn }}
        >
          {profitable ? `unit-profitable: value $${String(value)} > 2× cost` : `under threshold: value $${String(value)} < 2× cost`}
        </span>
      </div>
    </div>
  );
}

function Cell({
  icon: Icon, label, value, sub,
}: {
  icon: typeof Coins; label: string; value: string; sub: string;
}) {
  const t = useVfx();
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Icon className="w-3 h-3" style={{ color: t.textFaint }} />
      <div>
        <div className="text-[8.5px] font-bold uppercase tracking-[0.14em]" style={{ color: t.textFaint }}>
          {label}
        </div>
        <div className="text-[11px] font-mono" style={{ color: t.textHi }}>
          {value}
          <span className="ml-1.5" style={{ color: t.textFaint }}>{sub}</span>
        </div>
      </div>
    </div>
  );
}
