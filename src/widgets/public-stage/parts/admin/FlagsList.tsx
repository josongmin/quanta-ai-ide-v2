import { useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { Toggle } from '@shared/ui/forms';
import type { Flag } from './types';

export function FlagsList({
  flags, onChange,
}: { flags: Flag[]; onChange: (id: string, patch: Partial<Flag>) => void }) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      {flags.map((f, i) => (
        <FlagRow key={f.id} isFirst={i === 0}>
          <div className="flex flex-col min-w-0 gap-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                {f.id}
              </span>
              {f.enabled ? null : (
                <span
                  className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border-muted)',
                  }}
                >
                  off
                </span>
              )}
            </div>
            <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
              {f.description}
            </span>
          </div>

          <RolloutBar pct={f.rollout} dim={!f.enabled} />

          <div className="flex items-center gap-2 justify-start">
            <Toggle
              checked={f.acmeForced}
              onChange={(v) => { onChange(f.id, { acmeForced: v }); }}
              label={`Force on for ACME ${f.id}`}
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              ACME
            </span>
          </div>

          <button
            type="button"
            className="text-[11px] font-medium inline-flex items-center gap-1 justify-end"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--fg-strong)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--fg-muted)'; }}
          >
            Edit cohort
            <ExternalLink className="w-3 h-3" />
          </button>
        </FlagRow>
      ))}
    </div>
  );
}

function FlagRow({ isFirst, children }: { isFirst: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 py-3 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1.6fr 130px 100px 80px',
        gap: 16,
        borderTop: isFirst ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      {children}
    </div>
  );
}

function RolloutBar({ pct, dim }: { pct: number; dim: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: pct >= 75 ? 'var(--intent-success-fg)'
              : pct >= 25 ? 'var(--fg-accent)'
              :             'var(--fg-subtle)',
            opacity: dim ? 0.4 : 0.9,
          }}
        />
      </div>
      <span
        className="tabular-nums text-[11px] font-medium w-8 text-right"
        style={{ color: 'var(--fg-muted)' }}
      >
        {pct}%
      </span>
    </div>
  );
}
