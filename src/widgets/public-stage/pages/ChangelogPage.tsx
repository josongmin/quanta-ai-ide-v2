import { useMemo, useState } from 'react';
import { Mail, Sparkles, Wrench, Bug, Rss, ArrowRight, Check } from 'lucide-react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient, SeamDivider } from '@shared/ui/marketing';

type Category = 'New' | 'Improved' | 'Fixed';

const CATEGORY_ICONS = {
  New: Sparkles,
  Improved: Wrench,
  Fixed: Bug,
} as const;

type Entry = {
  id: string;
  date: string;          // ISO YYYY-MM-DD
  version: string;
  category: Category;
  title: string;
  bullets: string[];
  highlight?: boolean;   // bigger headline rendering
};

const ENTRIES: Entry[] = [
  {
    id: 'e1', date: '2026-05-08', version: 'v2026.05.0', category: 'New',
    title: 'AI policies, per-org', highlight: true,
    bullets: [
      'Restrict the model picker org-wide and lock down where prompts may travel',
      'Per-class data retention (audit / agent runs / chats), down to 0 days',
      'Live residency conflict warnings — see which models violate your region pick before saving',
    ],
  },
  {
    id: 'e2', date: '2026-05-02', version: 'v2026.04.7', category: 'Improved',
    title: 'Admission rules: severity tri-toggle',
    bullets: [
      'Replace boolean with Block / Warn / Off for every rule',
      'New "Reset to org default" action when a workspace overrides a policy',
      'Inheritance badge per rule shows whether you\'re inheriting or overriding',
    ],
  },
  {
    id: 'e3', date: '2026-04-25', version: 'v2026.04.6', category: 'Fixed',
    title: 'Webhook delivery retry tail',
    bullets: [
      'Endpoints under sustained 5xx no longer get stuck in a 5-minute back-off loop',
      'Failed deliveries can now be redelivered up to 7 days back, not 24h',
    ],
  },
  {
    id: 'e4', date: '2026-04-19', version: 'v2026.04.5', category: 'New',
    title: 'Custom roles (RBAC)',
    bullets: [
      'Duplicate any built-in role and tune its 20 permission toggles',
      'Per-permission danger flag — admission.bypass surfaces in red',
      'Role count + member count visible in the editor at all times',
    ],
  },
  {
    id: 'e5', date: '2026-04-12', version: 'v2026.04.0', category: 'New',
    title: 'Public app catalog',
    bullets: [
      'Browse the 12 surfaces of the Organization settings tree at /catalog',
      'cmd-k search jumps straight to any settings page',
      'Status pills surface which areas are live vs. planned',
    ],
  },
  {
    id: 'e6', date: '2026-03-30', version: 'v2026.03.8', category: 'Improved',
    title: 'Inbox bulk actions',
    bullets: [
      'Hover-revealed checkboxes on every row, with shift-click range select',
      'Mark-read / archive in the top action bar when ≥1 row is selected',
      'Group-by-day stays sticky across filter changes',
    ],
  },
  {
    id: 'e7', date: '2026-03-21', version: 'v2026.03.5', category: 'Fixed',
    title: 'GlassCard backdrop refraction in Safari',
    bullets: [
      'Removed an ancestor `transform: translateZ(0)` that was killing backdrop-filter',
      'Affects InspectPanel, FilterBar, and the chat agent tray',
    ],
  },
  {
    id: 'e8', date: '2026-03-12', version: 'v2026.03.0', category: 'New',
    title: 'Investigation handoff',
    bullets: [
      'Pass an in-progress investigation directly into fix-pipeline with full context',
      'Breadcrumb on the receiving side shows the original investigator + timestamp',
      'Followup strip suggests the next 3 likely actions based on the handoff payload',
    ],
  },
];

export default function ChangelogPage() {
  const [filter, setFilter] = useState<'All' | Category>('All');
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');

  const filtered = useMemo(
    () => filter === 'All' ? ENTRIES : ENTRIES.filter((e) => e.category === filter),
    [filter],
  );

  const counts: Record<'All' | Category, number> = useMemo(() => ({
    All:      ENTRIES.length,
    New:      ENTRIES.filter((e) => e.category === 'New').length,
    Improved: ENTRIES.filter((e) => e.category === 'Improved').length,
    Fixed:    ENTRIES.filter((e) => e.category === 'Fixed').length,
  }), []);

  return (
    <PublicShell active="changelog" width="bleed">
      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[460px]" intensity={0.55} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-10 flex flex-col items-center text-center gap-6">
          <Eyebrow>Changelog</Eyebrow>
          <HeadlineGradient accent="every release.">What we shipped, in</HeadlineGradient>
          <p className="text-[16px] leading-relaxed max-w-[580px]" style={{ color: 'var(--fg-muted)' }}>
            New capabilities, improvements, and the occasional honest &quot;we broke something, here&apos;s the fix.&quot;
            Subscribe for a monthly digest — no marketing, no growth-hack copy.
          </p>

          {/* Subscribe form */}
          <form
            onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
            className="flex items-center gap-2 mt-3"
          >
            <div
              className="flex items-center h-10 rounded-md w-[300px]"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 1px 2px color-mix(in srgb, var(--fg-strong) 6%, transparent)',
              }}
            >
              <Mail className="w-3.5 h-3.5 mx-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setSubscribed(false); }}
                required
                placeholder="you@company.com"
                className="flex-1 bg-transparent outline-none text-[12px] pr-3"
                style={{ color: 'var(--fg-strong)' }}
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-[12px] font-semibold transition-transform"
              style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {subscribed ? <><Check className="w-3.5 h-3.5" /> Subscribed</> : <>Subscribe <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
            <a
              href="/changelog.rss"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
              aria-label="RSS feed"
            >
              <Rss className="w-3.5 h-3.5" />
            </a>
          </form>
        </div>
      </section>

      {/* ─── BODY: timeline + sticky TOC ────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 pb-24">
        <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 240px' }}>
          {/* Timeline */}
          <div className="min-w-0">
            {/* Filter chips */}
            <div className="flex items-center gap-1.5 mb-8">
              {(['All', 'New', 'Improved', 'Fixed'] as const).map((c) => {
                const active = filter === c;
                const tone = c === 'New' ? 'success'
                  : c === 'Improved' ? 'info'
                  : c === 'Fixed' ? 'warn'
                  : 'neutral';
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setFilter(c); }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors"
                    style={{
                      background: active
                        ? (tone === 'success' ? 'var(--intent-success-bg)'
                          : tone === 'info'  ? 'var(--intent-info-bg)'
                          : tone === 'warn'  ? 'var(--intent-warn-bg)'
                          : 'var(--bg-active)')
                        : 'var(--bg-canvas)',
                      color: active
                        ? (tone === 'success' ? 'var(--intent-success-fg)'
                          : tone === 'info'  ? 'var(--intent-info-fg)'
                          : tone === 'warn'  ? 'var(--intent-warn-fg)'
                          : 'var(--fg-strong)')
                        : 'var(--fg-muted)',
                      border: `1px solid ${active
                        ? (tone === 'success' ? 'var(--intent-success-fg)'
                          : tone === 'info'  ? 'var(--intent-info-fg)'
                          : tone === 'warn'  ? 'var(--intent-warn-fg)'
                          : 'var(--border-default)')
                        : 'var(--border-default)'}`,
                    }}
                  >
                    {c}
                    <span
                      className="text-[10px] tabular-nums px-1.5 rounded"
                      style={{
                        background: active ? 'color-mix(in srgb, currentColor 16%, transparent)' : 'var(--bg-surface-muted)',
                        color: 'inherit',
                      }}
                    >
                      {counts[c]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Entries — vertical line on left */}
            <div className="relative pl-8">
              <div
                aria-hidden
                className="absolute top-2 bottom-2 w-px"
                style={{ left: 11, background: 'var(--border-muted)' }}
              />
              <div className="flex flex-col gap-10">
                {filtered.map((e) => <TimelineEntry key={e.id} entry={e} />)}
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-10 px-5 rounded-md text-[12px] font-semibold transition-colors"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-canvas)'; }}
              >
                Load older releases
              </button>
            </div>
          </div>

          {/* Sticky right TOC */}
          <aside className="min-w-0">
            <div className="sticky top-20 flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--fg-subtle)' }}>
                Recent releases
              </span>
              <ol className="flex flex-col gap-1.5 text-[12px]">
                {ENTRIES.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <a
                      href={`#${e.id}`}
                      className="flex items-center gap-2 py-1 hover:underline"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      <span className="font-mono tabular-nums shrink-0" style={{ color: 'var(--fg-subtle)', minWidth: 70 }}>{e.date.slice(5)}</span>
                      <span className="truncate">{e.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <SeamDivider />
              <a
                href="/changelog.rss"
                className="inline-flex items-center gap-1.5 mt-2 text-[12px]"
                style={{ color: 'var(--fg-link)' }}
              >
                <Rss className="w-3 h-3" /> RSS feed
              </a>
            </div>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Timeline entry

function TimelineEntry({ entry }: { entry: Entry }) {
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

function toneFor(c: Category): { fg: string; bg: string } {
  if (c === 'New')      return { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)' };
  if (c === 'Improved') return { fg: 'var(--intent-info-fg)',    bg: 'var(--intent-info-bg)'    };
  return                       { fg: 'var(--intent-warn-fg)',    bg: 'var(--intent-warn-bg)'    };
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}
