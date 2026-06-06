import { Minus, Plus } from 'lucide-react';

// Seat picker — slider + step buttons.
export function SeatPicker({
  value, minSeats, onChange,
}: { value: number; minSeats: number; onChange: (v: number) => void }) {
  const max = 100;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          Seats
        </span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => { onChange(Math.max(minSeats, value - 1)); }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
            aria-label="Decrease seats"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={minSeats}
            max={max}
            value={value}
            onChange={(e) => {
              const n = Math.max(minSeats, Math.min(max, Number(e.target.value) || minSeats));
              onChange(n);
            }}
            className="w-16 h-6 text-center text-[12px] font-mono tabular-nums rounded-md outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-strong)',
              border: '1px solid var(--border-default)',
            }}
          />
          <button
            type="button"
            onClick={() => { onChange(Math.min(max, value + 1)); }}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
            aria-label="Increase seats"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <input
        type="range"
        min={minSeats}
        max={max}
        value={value}
        onChange={(e) => { onChange(Number(e.target.value)); }}
        className="onb-seat-range"
        style={{
          accentColor: 'var(--fg-accent)',
          width: '100%',
        }}
        aria-label="Seats"
      />

      <div className="flex justify-between text-[9px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
        <span>{minSeats}</span>
        <span>{Math.floor(max / 2)}</span>
        <span>{max}+</span>
      </div>
    </div>
  );
}
