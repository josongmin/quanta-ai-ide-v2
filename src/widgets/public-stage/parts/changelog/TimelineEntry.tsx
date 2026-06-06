import { CATEGORY_ICONS, toneFor, formatDate, type Entry } from './types';

export function TimelineEntry({ entry }: { entry: Entry }) {
  const Icon = CATEGORY_ICONS[entry.category];
  const tone = toneFor(entry.category);

  return (
    <article id={entry.id} className="relative">
      {/* Dot on the line */}
      <div
        aria-hidden
        className="absolute -left-[28px] top-2 w-[18px] h-[18px] rounded-full flex items-center justify-center"
        style={{
          background: tone.bg,
          border: `2px solid ${tone.fg}`,
          boxShadow: `0 0 0 4px var(--bg-canvas)`,
        }}
      >
        <Icon className="w-2.5 h-2.5" style={{ color: tone.fg }} />
      </div>

      {/* Header line */}
      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
        <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
          {formatDate(entry.date)}
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
          style={{
            background: tone.bg,
            color: tone.fg,
            border: `1px solid color-mix(in srgb, ${tone.fg} 35%, transparent)`,
          }}
        >
          {entry.category}
        </span>
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          {entry.version}
        </span>
      </div>

      <h3
        className={`${entry.highlight ? 'text-[22px]' : 'text-[18px]'} font-semibold tracking-tight leading-snug mb-3`}
        style={{ color: 'var(--fg-strong)' }}
      >
        {entry.title}
      </h3>

      <ul className="flex flex-col gap-1.5 text-[14px] leading-relaxed" style={{ color: 'var(--fg-default)' }}>
        {entry.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              aria-hidden
              className="w-1 h-1 rounded-full mt-2 shrink-0"
              style={{ background: tone.fg }}
            />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
