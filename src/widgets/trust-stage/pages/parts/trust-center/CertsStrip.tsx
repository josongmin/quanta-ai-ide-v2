import { CheckCircle2 } from 'lucide-react';
import { CERTS } from './data';

export function CertsStrip() {
  return (
    <div className="mt-6 grid grid-cols-6 gap-3 w-full max-w-[840px]">
      {CERTS.map((c) => (
        <div
          key={c.id}
          className="rounded-xl p-3 flex flex-col items-center gap-1"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${c.tone} 14%, transparent)`,
              color: c.tone,
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {c.label}
          </span>
          <span className="text-[9px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            {c.sub}
          </span>
        </div>
      ))}
    </div>
  );
}
