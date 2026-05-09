import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { PolicyThreshold } from '../../model/types';
import { POLICY_THRESHOLDS } from '../../model/phaseData';
import { useVfx } from './tokens';

// Phase 3 — policy bundle. Thresholds live here, not as magic numbers
// in code. Mock controller; values are local-state only.

export function PolicyThresholds() {
  const t = useVfx();
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(POLICY_THRESHOLDS.map((p) => [p.id, p.value])),
  );

  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: t.cardBacking, borderColor: t.border }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3 h-3" style={{ color: t.textMuted }} />
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            policy thresholds
          </span>
        </div>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          tune what qualifies for safe-mechanical
        </span>
      </div>

      <div className="space-y-3">
        {POLICY_THRESHOLDS.map((p) => (
          <ThresholdRow
            key={p.id}
            policy={p}
            value={vals[p.id] ?? p.value}
            onChange={(v) => { setVals((prev) => ({ ...prev, [p.id]: v })); }}
          />
        ))}
      </div>

      <div
        className="mt-3 pt-3 border-t text-[9.5px] font-mono"
        style={{ borderColor: t.borderHair, color: t.textFaint }}
      >
        changes apply to future candidates · existing drafts re-gate on save
      </div>
    </div>
  );
}

function ThresholdRow({
  policy, value, onChange,
}: {
  policy: PolicyThreshold; value: number; onChange: (v: number) => void;
}) {
  const t = useVfx();
  const changed = value !== policy.value;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10.5px] font-bold" style={{ color: t.textHi }}>
          {policy.label}
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded ml-auto"
          style={{
            background: changed ? t.warnSoft : t.badgeBg,
            color: changed ? t.warn : t.textMuted,
          }}
        >
          {value} {policy.unit}
        </span>
      </div>
      <input
        type="range"
        min={policy.min}
        max={policy.max}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="w-full"
        style={{ accentColor: t.accent }}
      />
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {policy.min}
        </span>
        <span className="text-[9.5px]" style={{ color: t.textMuted }}>
          {policy.description}
        </span>
        <span className="text-[9px] font-mono" style={{ color: t.textFaint }}>
          {policy.max}
        </span>
      </div>
    </div>
  );
}
