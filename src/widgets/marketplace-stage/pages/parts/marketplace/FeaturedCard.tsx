import { Link } from '@tanstack/react-router';
import { Star, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '@shared/i18n';
import type { Integration } from './types';

export function FeaturedCard({ integration }: { integration: Integration }) {
  const { icon: Icon } = integration;
  return (
    <Link
      to={'/integrations/$slug' as never}
      params={{ slug: integration.slug } as never}
      className="group flex items-center gap-4 rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--fg-accent) 60%, var(--border-default))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
    >
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${integration.tone.from}, ${integration.tone.to})`,
        }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight truncate" style={{ color: 'var(--fg-strong)' }}>
            {integration.name}
          </h3>
          {integration.verified && (
            <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--fg-accent)' }} />
          )}
        </div>
        <p className="text-base leading-snug truncate" style={{ color: 'var(--fg-muted)' }}>
          {integration.blurb}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span className="tabular-nums">{integration.rating.toFixed(1)}</span>
          </span>
          <span className="tabular-nums">{formatNumber(integration.installs)} installs</span>
        </div>
      </div>
      <ArrowUpRight
        className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        style={{ color: 'var(--fg-link)' }}
      />
    </Link>
  );
}
