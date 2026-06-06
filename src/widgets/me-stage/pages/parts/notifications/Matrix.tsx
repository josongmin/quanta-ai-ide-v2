import { Checkbox } from '@shared/ui/forms';
import { CHANNELS } from './types';
import type { Channel, EventId, EventMeta, Settings } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Matrix grid

export function Matrix({
  groups, matrix, disabled, onCell, onRowAll,
}: {
  groups: [string, EventMeta[]][];
  matrix: Settings['matrix'];
  disabled: boolean;
  onCell: (event: EventId, channel: Channel, value: boolean) => void;
  onRowAll: (event: EventId, value: boolean) => void;
}) {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1fr 80px 80px 80px 80px',
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Event</span>
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <span key={c.id} className="inline-flex items-center justify-center gap-1">
              <Icon className="w-3 h-3" />
              {c.label}
            </span>
          );
        })}
      </div>

      {groups.map(([groupTitle, events], gi) => (
        <div key={groupTitle}>
          <div
            className="px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold"
            style={{
              color: 'var(--fg-muted)',
              background: 'var(--bg-canvas)',
              borderTop: gi === 0 ? 'none' : '1px solid var(--border-muted)',
            }}
          >
            {groupTitle}
          </div>
          {events.map((e) => {
            const row = matrix[e.id];
            const allOn = Object.values(row).every(Boolean);
            return (
              <div
                key={e.id}
                className="grid items-center gap-2 px-3 py-2"
                style={{
                  gridTemplateColumns: '1fr 80px 80px 80px 80px',
                  borderTop: '1px solid var(--border-muted)',
                  opacity: disabled ? 0.5 : 1,
                  pointerEvents: disabled ? 'none' : 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => { onRowAll(e.id, !allOn); }}
                  className="flex flex-col gap-0.5 text-left transition-colors"
                  title={allOn ? 'Disable all channels for this event' : 'Enable all channels for this event'}
                >
                  <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                    {e.label}
                  </span>
                  <span className="text-[10px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                    {e.sub}
                  </span>
                </button>
                {CHANNELS.map((c) => (
                  <div key={c.id} className="flex justify-center">
                    <Checkbox
                      checked={row[c.id]}
                      onChange={(v) => { onCell(e.id, c.id, v); }}
                      label={`${e.label} → ${c.label}`}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
