import { useId } from 'react';

type Props = {
  label: string;
  bounds: [number, number];
  value: [number, number];
  onChange: (next: [number, number]) => void;
  step?: number;
  format?: (n: number) => string;
};

export default function RangeFacet({
  label, bounds, value, onChange, step = 1, format,
}: Props) {
  const id = useId();
  const [lo, hi] = bounds;
  const fmt = format ?? ((n: number) => `${Math.round(n * 100) / 100}`);
  const pctLeft = ((value[0] - lo) / (hi - lo)) * 100;
  const pctRight = ((value[1] - lo) / (hi - lo)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-[10px]">
        <label htmlFor={id} className="text-slate-400 uppercase tracking-[0.18em] font-bold">{label}</label>
        <span className="text-slate-300 tabular-nums">
          {fmt(value[0])} – {fmt(value[1])}
        </span>
      </div>
      <div className="relative h-5">
        {/* track */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[3px] bg-slate-800 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-[#4f9a5c] rounded-full"
          style={{ left: `${pctLeft}%`, right: `${100 - pctRight}%` }}
        />
        <input
          id={id}
          type="range"
          min={lo} max={hi} step={step}
          value={value[0]}
          onChange={(e) => {
            const v = Math.min(+e.target.value, value[1]);
            onChange([v, value[1]]);
          }}
          className="range-thumb"
          style={{ zIndex: 2 }}
        />
        <input
          type="range"
          min={lo} max={hi} step={step}
          value={value[1]}
          onChange={(e) => {
            const v = Math.max(+e.target.value, value[0]);
            onChange([value[0], v]);
          }}
          className="range-thumb"
          style={{ zIndex: 3 }}
        />
      </div>
    </div>
  );
}
