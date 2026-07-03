import { ARCHITECTURE_LAYERS } from './data';

export function ArchitectureDiagram() {
  return (
    <div
      className="rounded-2xl p-6 mb-16"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        {ARCHITECTURE_LAYERS.map((b) => (
          <div
            key={b.label}
            className="rounded-lg p-4 flex items-center gap-3"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--fg-link) 14%, transparent)',
                color: 'var(--fg-link)',
              }}
            >
              <b.icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{b.label}</span>
              <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{b.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
