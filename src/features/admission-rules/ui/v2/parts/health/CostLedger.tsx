import { useMemo } from 'react';
import {
  estimateCost,
  type AdmissionRule, type CostClass,
} from '@entities/admission';
import { useV2 } from '../tokens';

export function CostLedger({ rules }: { rules: AdmissionRule[] }) {
  const t = useV2();
  const order: CostClass[] = ['instant', 'fast', 'medium', 'slow', 'background'];
  const counts = useMemo(() => {
    const out: Record<CostClass, number> = {
      instant: 0, fast: 0, medium: 0, slow: 0, background: 0,
    };
    for (const r of rules) out[estimateCost(r)]++;
    return out;
  }, [rules]);
  const total = rules.length;
  return (
    <div className="space-y-1.5">
      {order.map((c) => {
        const n = counts[c];
        if (n === 0) return null;
        const heavy = c === 'slow' || c === 'background';
        return (
          <div key={c} className="flex items-center gap-2 text-sm font-mono">
            <span className={heavy ? 'font-bold' : ''} style={{ color: heavy ? t.textBody : t.textMuted }}>{c}</span>
            <div className="flex-1 h-px" style={{ background: t.inset }} />
            <div
              className="h-1.5 rounded-full relative overflow-hidden"
              style={{ width: 80, background: t.inset }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(n / total) * 100}%`,
                  background: heavy ? t.textBody : t.textSubtle,
                }}
              />
            </div>
            <span className="tabular-nums w-6 text-right" style={{ color: t.textBody }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}
