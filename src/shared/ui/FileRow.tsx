import { C, type Tone } from '../lib/color';

export function FileRow({
  name, path, metrics, alert = false, onClick,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  isDark?: boolean;
  name: string;
  path: string;
  metrics: { label: string; value: string | number; tone?: Tone }[];
  alert?: boolean;
  onClick?: () => void;
}) {
  const Element = onClick ? 'button' : 'div';
  return (
    <Element
      onClick={onClick}
      className="w-full text-left flex flex-col gap-0.5 px-2 py-1.5 rounded-md transition-colors hover:[background:var(--bg-hover)]"
      style={{ background: 'var(--bg-surface-muted)' }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {alert && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.critical }} />
        )}
        <span
          className="text-sm font-bold font-mono truncate"
          style={{ color: 'var(--fg-default)' }}
        >
          {name}
        </span>
        <span
          className="text-2xs font-mono truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {path.split('.').join('/')}
        </span>
      </div>
      <div className="flex items-center gap-3 pl-0.5">
        {metrics.map((m) => {
          const color =
            m.tone === 'critical' ? C.critical :
            m.tone === 'warn'     ? C.warning  : null;
          return (
            <div key={m.label} className="flex items-baseline gap-1 text-xs">
              <span
                className="uppercase tracking-eyebrow"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {m.label}
              </span>
              <span
                className="font-bold tabular-nums"
                style={color ? { color } : { color: 'var(--fg-default)' }}
              >
                {m.value}
              </span>
            </div>
          );
        })}
      </div>
    </Element>
  );
}
