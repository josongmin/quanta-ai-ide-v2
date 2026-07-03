import { SUBPROCESSORS } from './data';

export function SubprocessorsTable() {
  return (
    <div
      className="rounded-xl overflow-hidden mb-16"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="grid items-center px-4 h-9 text-xs uppercase tracking-eyebrow font-semibold"
        style={{
          gridTemplateColumns: '1.2fr 1.6fr 1fr',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Subprocessor</span>
        <span>Purpose</span>
        <span>Region</span>
      </div>
      {SUBPROCESSORS.map((s, i) => (
        <div
          key={s.name}
          className="grid items-center px-4 h-11"
          style={{
            gridTemplateColumns: '1.2fr 1.6fr 1fr',
            borderBottom: i === SUBPROCESSORS.length - 1 ? 'none' : '1px solid var(--border-muted)',
          }}
        >
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{s.name}</span>
          <span className="text-base" style={{ color: 'var(--fg-muted)' }}>{s.purpose}</span>
          <span className="text-sm font-mono tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{s.region}</span>
        </div>
      ))}
    </div>
  );
}
