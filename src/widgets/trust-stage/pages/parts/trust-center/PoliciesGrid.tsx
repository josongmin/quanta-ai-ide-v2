import { HoverCard } from './HoverCard';
import { POLICIES } from './data';

export function PoliciesGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-16">
      {POLICIES.map((p) => (
        <HoverCard
          key={p.title}
          className="rounded-xl p-5 flex flex-col gap-3 transition-colors"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
          hover={{ background: 'var(--bg-hover)' }}
          rest={{ background: 'var(--bg-canvas)' }}
        >
          <div className="flex items-start justify-between">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                color: 'var(--fg-accent)',
              }}
            >
              <p.icon className="w-4 h-4" />
            </div>
            <span
              className="text-2xs uppercase tracking-eyebrow font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {p.tag}
            </span>
          </div>
          <h3 className="text-md font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            {p.title}
          </h3>
          <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>{p.blurb}</p>
        </HoverCard>
      ))}
    </div>
  );
}
