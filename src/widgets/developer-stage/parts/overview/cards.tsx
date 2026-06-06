import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import type { Card } from './data';

export function SectionTitle({
  icon: Icon, title, hint,
}: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; hint?: string }) {
  return (
    <header className="flex items-baseline justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {title}
        </h2>
      </div>
      {hint && (
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>{hint}</span>
      )}
    </header>
  );
}

export function BigCard({ card }: { card: Card }) {
  const { icon: Icon, title, blurb, meta, to } = card;
  return (
    <Link
      to={to as never}
      className="group flex flex-col gap-3 rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--fg-accent) 60%, var(--border-default))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 12%, transparent)',
            color: 'var(--fg-accent)',
          }}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <ArrowUpRight
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fg-link)' }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {title}
        </h3>
        <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
      </div>
      {meta && (
        <code className="text-[10px] font-mono tabular-nums mt-1" style={{ color: 'var(--fg-subtle)' }}>
          {meta}
        </code>
      )}
    </Link>
  );
}

export function SmallCard({ card }: { card: Card }) {
  const { icon: Icon, title, blurb, to } = card;
  return (
    <Link
      to={to as never}
      className="group flex flex-col gap-2 rounded-lg p-4 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-canvas)';
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>{title}</span>
        <ArrowUpRight
          className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--fg-link)' }}
        />
      </div>
      <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
    </Link>
  );
}
