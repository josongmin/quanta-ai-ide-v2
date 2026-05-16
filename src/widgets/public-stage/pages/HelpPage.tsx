import { useMemo, useState } from 'react';
import {
  Search, Rocket, ShieldCheck, Bot, Layers, CreditCard, AlertTriangle,
  MessageCircle, Mail, Users, Sparkles, BookOpen,
  TrendingUp, Clock, FileText, ExternalLink,
} from 'lucide-react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SectionHead, LiftCard, SeamDivider } from '@shared/ui/marketing';
import { formatNumber } from '@shared/i18n';

type CategoryId = 'getting-started' | 'admission' | 'agents' | 'workspaces' | 'billing' | 'troubleshooting';

type Article = {
  id: string;
  title: string;
  category: CategoryId;
  readMin: number;
  views: number;
};

const CATEGORIES: {
  id: CategoryId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  count: number;
  // 2-color gradient for the icon tile
  from: string;
  to: string;
}[] = [
  { id: 'getting-started', title: 'Getting started', description: 'Install, connect a repo, ship your first admission rule.', icon: Rocket,        count: 18, from: 'var(--brand-vivid)',         to: 'var(--fg-link)' },
  { id: 'admission',       title: 'Admission gates', description: 'Author rules, debug failures, propagate to workspaces.', icon: ShieldCheck,    count: 24, from: 'var(--intent-success-fg)',   to: 'var(--intent-info-fg)' },
  { id: 'agents',          title: 'Agents',          description: 'Configure, throttle, audit, and kill autonomous runs.',  icon: Bot,            count: 31, from: 'var(--fg-link)',             to: 'var(--brand-vivid)' },
  { id: 'workspaces',      title: 'Workspaces',      description: 'Source connection, ownership, environments, secrets.',   icon: Layers,         count: 19, from: 'var(--intent-info-fg)',      to: 'var(--brand-vivid)' },
  { id: 'billing',         title: 'Billing',         description: 'Plans, seats, invoices, tax IDs, contracts.',            icon: CreditCard,     count: 12, from: 'var(--intent-warn-fg)',      to: 'var(--brand-vivid)' },
  { id: 'troubleshooting', title: 'Troubleshooting', description: '5xx, webhook delivery, SSO loops, agent timeouts.',      icon: AlertTriangle,  count: 22, from: 'var(--intent-danger-fg)',    to: 'var(--intent-warn-fg)' },
];

const ARTICLES: Article[] = [
  // Getting started
  { id: 'a1',  title: 'Install the CLI in 60 seconds',                    category: 'getting-started', readMin: 2, views: 12842 },
  { id: 'a2',  title: 'Connect your first GitHub workspace',              category: 'getting-started', readMin: 4, views: 9821  },
  { id: 'a3',  title: 'Walkthrough: ship your first admission gate',     category: 'getting-started', readMin: 6, views: 7102  },
  // Admission
  { id: 'a4',  title: 'Anatomy of an admission rule',                     category: 'admission', readMin: 5,  views: 6291 },
  { id: 'a5',  title: 'Block vs. Warn vs. Off: choosing the right severity', category: 'admission', readMin: 3, views: 5402 },
  { id: 'a6',  title: 'Inheriting org defaults in workspaces',            category: 'admission', readMin: 4,  views: 4218 },
  // Agents
  { id: 'a7',  title: 'Why my agent stopped mid-run',                    category: 'agents', readMin: 3, views: 8132 },
  { id: 'a8',  title: 'Setting concurrency caps per agent',               category: 'agents', readMin: 4, views: 4980 },
  { id: 'a9',  title: 'Reading the agent activity log',                   category: 'agents', readMin: 5, views: 4322 },
  // Workspaces
  { id: 'a10', title: 'CODEOWNERS routing 101',                           category: 'workspaces', readMin: 4, views: 5481 },
  { id: 'a11', title: 'Promoting a deploy to production',                 category: 'workspaces', readMin: 3, views: 3902 },
  { id: 'a12', title: 'Secrets: rotating without downtime',               category: 'workspaces', readMin: 6, views: 3221 },
  // Billing
  { id: 'a13', title: 'Adding a tax ID to your invoices',                 category: 'billing', readMin: 2, views: 2841 },
  { id: 'a14', title: 'Switching plans without losing trial features',    category: 'billing', readMin: 3, views: 2102 },
  { id: 'a15', title: 'Understanding seat-based proration',               category: 'billing', readMin: 4, views: 1842 },
  // Troubleshooting
  { id: 'a16', title: 'SSO is in a loop after enabling SCIM',             category: 'troubleshooting', readMin: 5, views: 4391 },
  { id: 'a17', title: 'Webhook deliveries stuck at 502',                  category: 'troubleshooting', readMin: 4, views: 3821 },
  { id: 'a18', title: 'My fix-pipeline run timed out — why?',             category: 'troubleshooting', readMin: 4, views: 3211 },
];

export default function HelpPage() {
  const [q, setQ] = useState('');

  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const n = q.toLowerCase();
    return ARTICLES.filter((a) => a.title.toLowerCase().includes(n)).slice(0, 6);
  }, [q]);

  const trending = useMemo(
    () => [...ARTICLES].sort((a, b) => b.views - a.views).slice(0, 5),
    [],
  );

  return (
    <PublicShell active="help" width="bleed">
      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[520px]" intensity={0.55} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-10 flex flex-col items-center text-center gap-6">
          <Eyebrow>Help center</Eyebrow>
          <HeadlineGradient accent="working again.">Get back to</HeadlineGradient>
          <p className="text-[16px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
            126 articles, written by the engineers who shipped the feature. Cmd-K from
            anywhere in the app, or search below.
          </p>

          {/* Search box */}
          <div className="relative w-[560px] max-w-full mt-3">
            <div
              className="flex items-center h-12 rounded-xl"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 8px 24px -10px color-mix(in srgb, var(--fg-strong) 18%, transparent)',
              }}
            >
              <Search className="w-4 h-4 mx-4 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); }}
                placeholder="Try “admission rule”, “SSO loop”, “seat pricing”…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: 'var(--fg-strong)' }}
              />
              <span
                className="hidden sm:inline-flex items-center gap-1 mr-3 text-[10px] font-mono px-2 py-1 rounded"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-subtle)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                ⌘ K
              </span>
            </div>

            {/* Live results popover */}
            {q.trim() && (
              <div
                className="absolute left-0 right-0 mt-2 rounded-xl overflow-hidden text-left"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {matches.length === 0 ? (
                  <div className="px-4 py-6 text-[12px] text-center" style={{ color: 'var(--fg-subtle)' }}>
                    No matches for “{q}”. Try a broader term, or contact support.
                  </div>
                ) : matches.map((a, i) => {
                  const cat = CATEGORIES.find((c) => c.id === a.category)!;
                  const Icon = cat.icon;
                  return (
                    <button
                      type="button"
                      key={a.id}
                      className="w-full text-left flex items-center gap-3 px-4 h-12 transition-colors bg-transparent border-0 cursor-pointer"
                      style={{
                        borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{a.title}</span>
                        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                          {cat.title}
                        </span>
                      </div>
                      <span className="text-[11px] shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                        {a.readMin} min
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links under search */}
          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            <span style={{ color: 'var(--fg-subtle)' }}>Popular:</span>
            {['Connect a repo', 'Admission rules', 'Why agent failed', 'Rotate secrets', 'Tax ID'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setQ(t); }}
                className="px-2 py-0.5 rounded-md transition-colors"
                style={{ color: 'var(--fg-link)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8"><SeamDivider /></div>

      {/* ─── BROWSE BY TOPIC ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16">
        <SectionHead
          eyebrow="Browse by topic"
          title="Six neighborhoods. 126 articles."
          lede="Pick a category to see the full library, or scroll down for what's trending this week."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} />)}
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-16"><SeamDivider /></div>

      {/* ─── TRENDING + NEW ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleList
          eyebrow={<><TrendingUp className="w-3 h-3" /> Most viewed this week</>}
          articles={trending}
          showCategory
        />
        <ArticleList
          eyebrow={<><Sparkles className="w-3 h-3" /> Recently published</>}
          articles={ARTICLES.slice(0, 5)}
          showCategory
        />
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-16"><SeamDivider /></div>

      {/* ─── CONTACT BAND ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-16 mb-12">
        <SectionHead
          eyebrow="Still stuck?"
          title="Talk to a human in under 4 hours."
          lede="Pick the channel that fits the situation. Our support engineers are real engineers — not first-responders reading from a script."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ContactCard
            icon={MessageCircle}
            title="Live chat"
            description="Open the chat bubble inside the app. Fastest for product questions."
            cta="Open chat"
            tone="brand"
          />
          <ContactCard
            icon={Mail}
            title="Email support"
            description="support@acme.com · We acknowledge in 4 business hours, with a real engineer."
            cta="Send email"
            tone="info"
          />
          <ContactCard
            icon={Users}
            title="Community"
            description="Discord with 4,200 engineers. Great for opinionated patterns and battle stories."
            cta="Join Discord"
            tone="success"
          />
        </div>
      </section>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Category card

function CategoryCard({ category }: { category: typeof CATEGORIES[number] }) {
  const Icon = category.icon;
  const popular = ARTICLES.filter((a) => a.category === category.id).slice(0, 3);
  return (
    <LiftCard className="p-5 gap-4">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${category.from}, ${category.to})`,
            boxShadow: `0 6px 18px -8px ${category.from}`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: 'var(--bg-canvas)' }} />
        </div>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[14.5px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {category.title}
            </span>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {category.count} articles
            </span>
          </div>
          <span className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            {category.description}
          </span>
        </div>
      </div>
      <ul className="flex flex-col mt-1 -mx-1">
        {popular.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md transition-colors text-[12px] bg-transparent border-0 cursor-pointer"
              style={{ color: 'var(--fg-default)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                <span className="truncate">{a.title}</span>
              </span>
              <span className="flex items-center gap-0.5 text-[10px] tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                <Clock className="w-2.5 h-2.5" /> {a.readMin}m
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[11px] font-semibold mt-2 bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: 'var(--fg-link)', font: 'inherit' }}
      >
        See all {category.count} →
      </button>
    </LiftCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Article list (Trending / Recent)

function ArticleList({
  eyebrow, articles, showCategory,
}: { eyebrow: React.ReactNode; articles: Article[]; showCategory?: boolean }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center gap-1.5 px-4 h-10 text-[10px] uppercase tracking-[0.18em] font-semibold"
        style={{
          background: 'var(--bg-canvas)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {eyebrow}
      </div>
      <ol>
        {articles.map((a, i) => {
          const cat = CATEGORIES.find((c) => c.id === a.category)!;
          return (
            <li key={a.id}>
              <button
                type="button"
                className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors bg-transparent border-0 cursor-pointer"
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span
                  className="font-mono text-[10px] tabular-nums shrink-0 w-6"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <BookOpen className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: 'var(--fg-strong)' }}>
                  {a.title}
                </span>
                {showCategory && (
                  <span className="text-[10px] uppercase tracking-[0.14em] font-semibold shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                    {cat.title}
                  </span>
                )}
                <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)' }}>
                  {formatNumber(a.views)} views
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Contact card

function ContactCard({
  icon: Icon, title, description, cta, tone,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  cta: string;
  tone: 'brand' | 'success' | 'info';
}) {
  const fg =
    tone === 'success' ? 'var(--intent-success-fg)'
    : tone === 'info'  ? 'var(--intent-info-fg)'
    : 'var(--brand-fg)';
  const bg =
    tone === 'success' ? 'var(--intent-success-bg)'
    : tone === 'info'  ? 'var(--intent-info-bg)'
    : 'var(--brand-bg)';
  return (
    <LiftCard className="p-6 gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: bg,
          color: fg,
          border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
        }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{title}</span>
      <p className="text-[12px] leading-relaxed flex-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[12px] font-semibold mt-2 bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: fg, font: 'inherit' }}
      >
        {cta} <ExternalLink className="w-3 h-3" />
      </button>
    </LiftCard>
  );
}

