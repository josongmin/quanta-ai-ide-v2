// ─────────────────────────────────────────────────────────────────────────
// Cost input

export function CostInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>$</span>
      <input
        type="number"
        min={0}
        max={500}
        step={1}
        value={value}
        onChange={(e) => { onChange(Math.max(0, Math.min(500, Number(e.target.value) || 0))); }}
        className="w-20 h-8 px-2.5 rounded-md text-[12px] tabular-nums outline-none text-right"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      />
      <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>/ day</span>
      {value === 0 && (
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold ml-2"
          style={{ color: 'var(--intent-warn-fg)' }}
        >
          No cap set
        </span>
      )}
    </div>
  );
}
