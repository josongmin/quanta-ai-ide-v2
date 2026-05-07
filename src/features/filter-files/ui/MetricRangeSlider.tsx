import { useId } from 'react';

type Props = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  bounds: [number, number];
  value: [number, number];
  onChange: (next: [number, number]) => void;
  step?: number;
  format?: (n: number) => string;
};

export default function MetricRangeSlider({
  label, icon: Icon, bounds, value, onChange, step = 1, format,
}: Props) {
  const id = useId();
  const [lo, hi] = bounds;
  const fmt = format ?? ((n: number) => `${Math.round(n)}`);
  const pctLeft = ((value[0] - lo) / (hi - lo || 1)) * 100;
  const pctRight = ((value[1] - lo) / (hi - lo || 1)) * 100;

  return (
    <div
      className="px-2.5 py-1.5 rounded-xl border mb-1 transition-all duration-300 hover-surface"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <span style={{ color: 'var(--fg-subtle)' }}>
              <Icon className="w-3 h-3" />
            </span>
          )}
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[10px] font-black font-mono tabular-nums"
          style={{ color: 'var(--fg-default)' }}
        >
          {fmt(value[0])} – {fmt(value[1])}
        </span>
      </div>
      <div className="relative h-3">
        <div
          className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] rounded-full"
          style={{ background: 'var(--border-default)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full"
          style={{
            left: `${pctLeft}%`,
            right: `${100 - pctRight}%`,
            background: 'var(--fg-default)',
          }}
        />
        <input
          id={id} type="range"
          min={lo} max={hi} step={step}
          value={value[0]}
          onChange={(e) => { onChange([Math.min(+e.target.value, value[1]), value[1]]); }}
          className="dual-range-thumb"
          style={{ zIndex: 2 }}
        />
        <input
          type="range"
          min={lo} max={hi} step={step}
          value={value[1]}
          onChange={(e) => { onChange([value[0], Math.max(+e.target.value, value[0])]); }}
          className="dual-range-thumb"
          style={{ zIndex: 3 }}
        />
      </div>
    </div>
  );
}
