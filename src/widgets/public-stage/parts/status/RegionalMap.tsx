import { Globe } from 'lucide-react';
import { StatusDot } from '@shared/ui';
import { REGIONS } from './data';
import { STATUS_FG } from './types';
import { PulseDot } from './atoms';

// Regional map — pure SVG with dots positioned by lat/lon
export function RegionalMap() {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-6"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>Edge regions</span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          Median latency from your nearest probe
        </span>
      </div>

      <div className="relative w-full" style={{ height: 260 }}>
        {/* Faint world-grid backdrop */}
        <svg
          aria-hidden
          viewBox="0 0 100 50"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="0.5" cy="0.5" r="0.4" fill="color-mix(in srgb, var(--fg-strong) 14%, transparent)" />
            </pattern>
          </defs>
          <rect width="100" height="50" fill="url(#dots)" />
        </svg>

        {/* Region pins */}
        {REGIONS.map((r) => {
          const color = STATUS_FG[r.status];
          return (
            <div
              key={r.id}
              className="absolute group"
              style={{
                left: `${r.lon}%`,
                top: `${r.lat}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PulseDot status={r.status} />
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 rounded-md whitespace-nowrap text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span className="font-semibold" style={{ color }}>{r.label}</span>
                <span className="ml-2 font-mono tabular-nums" style={{ color: 'var(--fg-muted)' }}>{r.latencyMs}ms</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Region table strip below the map */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-muted)' }}>
        {REGIONS.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 min-w-0">
              <StatusDot color={STATUS_FG[r.status]} size="xs" />
              <span className="truncate" style={{ color: 'var(--fg-default)' }}>{r.label}</span>
            </span>
            <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-muted)' }}>{r.latencyMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
