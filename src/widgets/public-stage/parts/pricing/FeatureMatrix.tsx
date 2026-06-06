import { useRef, type ReactNode } from 'react';
import { Check, Minus } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { PLANS, MATRIX } from './data';

export function FeatureMatrix() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="grid items-center px-4 sm:px-6 h-12 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1.6fr repeat(4, 1fr)',
          gap: 12,
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          color: 'var(--fg-subtle)',
        }}
      >
        <span>Feature</span>
        {PLANS.map((p) => (
          <span key={p.id} className="text-center" style={{ color: p.featured ? 'var(--fg-accent)' : 'var(--fg-default)' }}>
            {p.name}
          </span>
        ))}
      </div>

      {MATRIX.map((g, gi) => (
        <div key={g.group}>
          <div
            className="px-4 sm:px-6 py-2 text-[10px] uppercase tracking-[0.18em] font-semibold"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-subtle)',
              borderTop: gi === 0 ? 'none' : '1px solid var(--border-muted)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            {g.group}
          </div>
          {g.rows.map((r, ri) => {
            const Icon = r.icon;
            return (
              <FeatureRow key={r.id} isFirst={ri === 0}>
                <span className="flex items-center gap-2.5" style={{ color: 'var(--fg-default)' }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                  {r.label}
                </span>
                {r.cells.map((c, ci) => (
                  <span key={ci} className="flex items-center justify-center text-[12px] tabular-nums">
                    {typeof c === 'boolean' ? (
                      c
                        ? <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
                        : <Minus className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
                    ) : (
                      <span style={{ color: 'var(--fg-default)' }}>{c}</span>
                    )}
                  </span>
                ))}
              </FeatureRow>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ isFirst, children }: { isFirst: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-4 sm:px-6 h-12 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1.6fr repeat(4, 1fr)',
        gap: 12,
        borderTop: isFirst ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      {children}
    </div>
  );
}
