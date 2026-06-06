import { confidenceTone } from '../../../lib';

export function ConfidencePanel({ value }: { value: number }) {
  const tone = confidenceTone(value);
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-stretch gap-4">
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-1">
          <span
            className="text-[34px] font-black leading-none tabular-nums tracking-tight"
            style={{ color: 'var(--fg-strong)' }}
          >
            {pct}
          </span>
          <span
            className="text-[14px] font-bold leading-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            %
          </span>
        </div>
        <div
          className="mt-1 text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-muted)' }}
          title="Confidence in the recommended primary owner — combined signal across the 4 ownership layers"
        >
          Owner confidence
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            signal strength
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
            style={{
              background: tone.bg,
              color: tone.fg,
            }}
          >
            {tone.label}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden w-full"
          style={{ background: 'var(--bg-surface-muted)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: tone.vivid,
            }}
          />
        </div>
        <div
          className="mt-1 flex justify-between text-[9px] font-mono tabular-nums"
          style={{ color: 'var(--fg-subtle)' }}
        >
          <span>0</span>
          <span>40</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
