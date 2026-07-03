import { Link } from '@tanstack/react-router';
import { Star, ShieldCheck } from 'lucide-react';
import { formatNumber } from '@shared/i18n';
import type { Integration } from './types';

export function IntegrationCard({ integration }: { integration: Integration }) {
  const { icon: Icon } = integration;
  return (
    <Link
      to={'/integrations/$slug' as never}
      params={{ slug: integration.slug } as never}
      className="group flex flex-col gap-3 rounded-xl p-4 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--fg-on-accent)]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${integration.tone.from}, ${integration.tone.to})`,
          }}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center gap-1">
          {integration.verified && (
            <span
              title="Verified"
              className="inline-flex items-center gap-1 text-2xs uppercase tracking-eyebrow font-semibold"
              style={{ color: 'var(--fg-accent)' }}
            >
              <ShieldCheck className="w-3 h-3" />
              verified
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {integration.name}
        </h3>
        <p className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>{integration.blurb}</p>
      </div>
      <div className="flex items-center gap-3 mt-auto text-xs" style={{ color: 'var(--fg-subtle)' }}>
        <span className="inline-flex items-center gap-1">
          <Star className="w-3 h-3" />
          <span className="tabular-nums">{integration.rating.toFixed(1)}</span>
        </span>
        <span className="tabular-nums">{formatNumber(integration.installs)} installs</span>
      </div>
    </Link>
  );
}
