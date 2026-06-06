import { STATUS_FG, type Status } from './types';

// Pulse dot (live indicator)
export function PulseDot({ status }: { status: Status }) {
  const color = STATUS_FG[status];
  return (
    <span className="relative inline-flex w-2 h-2 mr-1">
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pulse-ring"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      <style>{`
        .pulse-ring {
          animation: status-pulse 1.8s ease-out infinite;
        }
        @keyframes status-pulse {
          0%   { transform: scale(1); opacity: 0.7; }
          80%  { transform: scale(2.6); opacity: 0; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>
    </span>
  );
}

export function UptimeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--fg-strong)' }}>{value}</span>
      <span style={{ color: 'var(--fg-subtle)' }}>{label}</span>
    </div>
  );
}

export function Divider() {
  return <span aria-hidden className="w-px h-3" style={{ background: 'var(--border-muted)' }} />;
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
