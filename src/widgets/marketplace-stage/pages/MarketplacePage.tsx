import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, Filter, Sparkles, ArrowUpRight } from 'lucide-react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SeamDivider } from '@shared/ui/marketing';
import type { Category } from './parts/marketplace/types';
import { CATEGORIES, INTEGRATIONS } from './parts/marketplace/data';
import { SectionLabel } from './parts/marketplace/SectionLabel';
import { FeaturedCard } from './parts/marketplace/FeaturedCard';
import { IntegrationCard } from './parts/marketplace/IntegrationCard';

export default function MarketplacePage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category>('all');

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return INTEGRATIONS.filter((i) => {
      const matchCat = cat === 'all' || i.category === cat;
      const matchQ = !n
        || i.name.toLowerCase().includes(n)
        || i.vendor.toLowerCase().includes(n)
        || i.blurb.toLowerCase().includes(n);
      return matchCat && matchQ;
    });
  }, [q, cat]);

  const featured = INTEGRATIONS.filter((i) => i.featured);

  return (
    <PublicShell width="bleed">
      <div className="relative">
        <HeroBackdrop height="h-[460px]" intensity={0.5} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-16 pb-12 flex flex-col items-center text-center gap-5">
          <Eyebrow>Marketplace</Eyebrow>
          <HeadlineGradient accent="every tool">Plug se.field into</HeadlineGradient>
          <p className="text-lg leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
            Verified, security-reviewed integrations from Slack to Datadog. Install in one click; revoke just as fast.
          </p>

          {/* Search */}
          <div
            className="mt-4 flex items-center gap-2 h-12 w-full max-w-[560px] px-4 rounded-full"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 4px 20px -8px color-mix(in srgb, var(--fg-strong) 18%, transparent)',
            }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); }}
              placeholder="Search integrations — Slack, Datadog, OpenAI…"
              className="flex-1 bg-transparent outline-none text-md"
              style={{ color: 'var(--fg-strong)' }}
            />
            <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {INTEGRATIONS.length} apps
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-8 pb-24">
        {/* Featured strip */}
        {q.trim() === '' && cat === 'all' && (
          <>
            <SectionLabel icon={Sparkles} label="Featured" hint="Hand-picked by the team" />
            <div className="grid grid-cols-2 gap-3 mb-12">
              {featured.slice(0, 4).map((i) => (
                <FeaturedCard key={i.slug} integration={i} />
              ))}
            </div>
            <SeamDivider />
          </>
        )}

        {/* Category filter */}
        <div className="flex items-center gap-2 my-6 flex-wrap">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
          {CATEGORIES.map((c) => {
            const active = c.id === cat;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCat(c.id); }}
                className="h-8 px-3 rounded-full text-sm font-medium transition-colors"
                style={{
                  background: active ? 'color-mix(in srgb, var(--fg-accent) 12%, transparent)' : 'transparent',
                  color: active ? 'var(--fg-accent)' : 'var(--fg-muted)',
                  border: `1px solid ${active ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-default)'}`,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((i) => (
            <IntegrationCard key={i.slug} integration={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-base" style={{ color: 'var(--fg-subtle)' }}>
            No integrations match &quot;{q}&quot;.
          </div>
        )}

        {/* CTA: build your own */}
        <div
          className="mt-16 rounded-2xl p-8 flex items-center justify-between gap-6 overflow-hidden relative"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 90% 50%, color-mix(in srgb, var(--fg-accent) 16%, transparent), transparent 70%)',
            }}
          />
          <div className="relative flex flex-col gap-1">
            <h3 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Need something custom?
            </h3>
            <p className="text-base" style={{ color: 'var(--fg-muted)' }}>
              Build a private integration with our OAuth + webhooks. Or list it publicly — partners get a fast-track review.
            </p>
          </div>
          <div className="relative flex items-center gap-2 shrink-0">
            <Link
              to={'/developers' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold transition-colors"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              Developer docs
              <ArrowUpRight className="w-3 h-3" />
            </Link>
            <Link
              to={'/contact-sales' as never}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold transition-colors"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
            >
              Partner with us
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}

export { INTEGRATIONS };
