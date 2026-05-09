import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReanalysisDelta } from '../../model/types';
import { REANALYSIS } from '../../model/phaseData';
import { useVfx } from './tokens';

// Phase 2 — post-patch re-analysis. The same engine fields (taint,
// blast, hotspot, policy, unknown zone) re-run after the patch lands.
// Shown as bar pairs (before/after) so the trend is readable in <5s.

export function PostPatchReanalysis({ caseId }: { caseId: string }) {
  const t = useVfx();
  const deltas: ReanalysisDelta[] = REANALYSIS[caseId] ?? [];

  if (deltas.length === 0) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ background: t.cardBacking, borderColor: t.border }}
      >
        <Header />
        <div className="text-[11px] mt-2" style={{ color: t.textFaint }}>
          re-analysis is empty — patch did not produce a deliverable to re-measure.
        </div>
      </div>
    );
  }

  const max = Math.max(...deltas.flatMap((d) => [d.before, d.after, 1]));

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <Header />

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
        {deltas.map((d) => (
          <DeltaBar key={d.metric} delta={d} max={max} />
        ))}
      </div>
    </div>
  );
}

function Header() {
  const t = useVfx();
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: t.textMuted }}
      >
        post-patch re-analysis
      </span>
      <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
        engine re-run · before → after
      </span>
    </div>
  );
}

function DeltaBar({ delta, max }: { delta: ReanalysisDelta; max: number }) {
  const t = useVfx();
  const isLowerBetter = delta.metric !== 'unknown zone' || true; // all metrics: lower = better
  const trend = delta.after < delta.before ? 'down' : delta.after > delta.before ? 'up' : 'flat';
  const good = isLowerBetter ? trend === 'down' : trend === 'up';
  const Icon = trend === 'down' ? ArrowDown : trend === 'up' ? ArrowUp : Minus;
  const color = trend === 'flat' ? t.textMuted : good ? t.ok : t.bad;

  const beforePct = (delta.before / max) * 100;
  const afterPct  = (delta.after  / max) * 100;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
          style={{ color: t.textBody }}
        >
          {delta.metric}
        </span>
        <Icon className="w-2.5 h-2.5 ml-auto" style={{ color }} />
        <span className="text-[10px] font-mono" style={{ color }}>
          {delta.before}{delta.unit ? ` ${delta.unit}` : ''} → {delta.after}{delta.unit ? ` ${delta.unit}` : ''}
        </span>
      </div>
      <div
        className="h-1.5 rounded relative overflow-hidden"
        style={{ background: t.borderHair }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${beforePct}%`, background: t.textFaint, opacity: 0.5 }}
        />
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${afterPct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8.5px] font-mono" style={{ color: t.textFaint }}>
          before
        </span>
        <span className="text-[8.5px] font-mono" style={{ color: t.textFaint }}>
          after
        </span>
      </div>
    </div>
  );
}
