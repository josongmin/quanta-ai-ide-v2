import { Check } from 'lucide-react';
import type { Density } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Density picker — visual rows

export function DensityPicker({ value, onChange }: { value: Density; onChange: (v: Density) => void }) {
  const opts: { id: Density; label: string; rows: number; gap: string }[] = [
    { id: 'compact',     label: 'Compact',     rows: 6, gap: '4px' },
    { id: 'comfortable', label: 'Comfortable', rows: 4, gap: '8px' },
    { id: 'roomy',       label: 'Roomy',       rows: 3, gap: '12px' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); }}
            className="flex flex-col gap-2 p-3 rounded-md transition-colors"
            style={{
              background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
              border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
            }}
          >
            <div
              className="aspect-video w-full rounded p-2 flex flex-col"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-muted)',
                gap: o.gap,
              }}
            >
              {Array.from({ length: o.rows }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded"
                  style={{ background: 'var(--border-default)' }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold"
                style={{ color: active ? 'var(--fg-strong)' : 'var(--fg-default)' }}
              >
                {o.label}
              </span>
              {active && <Check className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
