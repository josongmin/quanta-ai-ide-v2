import { CHANNELS } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Delivery channels — one card per channel

export function ChannelCards() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CHANNELS.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.id}
            className="flex flex-col gap-1 p-3 rounded-md"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-strong)' }} />
              <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
                {c.label}
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
              {c.sub}
            </span>
          </div>
        );
      })}
    </div>
  );
}
