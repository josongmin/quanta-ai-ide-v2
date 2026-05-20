import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Search, ArrowUpRight, Lock } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { ScrollPane } from '@shared/ui';
import { useTabVisibility } from '@features/workspace-tabs';
import {
  CATALOG, GROUP_META, GROUP_ORDER, catalogStats,
  type CatalogEntry, type CatalogStatus,
} from './registry';

// Lightweight management page for the SaaS scaffold pages. Lists every
// surface from the registry, filtered by a query box. Live entries are
// real <Link>s; planned/stub entries are inert with a status pill so we
// can see at a glance what is left to build.
export default function CatalogStage() {
  const { isDark } = useTheme();
  const [q, setQ] = useState('');
  const visible = useTabVisibility();

  const stats = useMemo(() => catalogStats(), []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return CATALOG;
    return CATALOG.filter((c) =>
      c.title.toLowerCase().includes(needle)
      || c.blurb.toLowerCase().includes(needle)
      || c.id.toLowerCase().includes(needle)
      || c.group.toLowerCase().includes(needle),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<string, CatalogEntry[]>();
    for (const e of filtered) {
      const arr = m.get(e.group) ?? [];
      arr.push(e);
      m.set(e.group, arr);
    }
    return m;
  }, [filtered]);

  return (
    <ScrollPane
      scope="catalog"
      visible={visible}
      className="absolute inset-0 overflow-y-auto"
      style={{ background: isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)' }}
    >
      <div className="max-w-[960px] mx-auto px-10 pt-12 pb-32">
        <header className="flex flex-col gap-3 mb-10">
          <span
            className="text-[11px] uppercase tracking-[0.14em] font-medium"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Internal · catalog
          </span>
          <div className="flex items-baseline gap-3">
            <h1
              className="text-[24px] font-semibold tracking-tight leading-none"
              style={{ color: 'var(--fg-strong)' }}
            >
              SaaS feature catalog
            </h1>
            <span className="text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
              {stats.live} live · {stats.stub} stub · {stats.planned} planned
            </span>
          </div>
          <p className="text-[12px] leading-snug max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
            Every generic-SaaS surface this app needs (auth, settings, billing, admin).
            Click a live entry to open the page. Planned entries are not yet wired.
          </p>
        </header>

        <div className="mb-8">
          <div
            className="flex items-center gap-2 h-9 px-3 rounded-md"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); }}
              placeholder="Filter by name, group, or keyword…"
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--fg-strong)' }}
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(''); }}
                className="text-[10px] uppercase tracking-[0.14em] font-medium px-1.5 py-0.5 rounded"
                style={{ color: 'var(--fg-subtle)', background: 'var(--bg-active)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {GROUP_ORDER.map((g) => {
            const items = grouped.get(g);
            if (!items || items.length === 0) return null;
            const meta = GROUP_META[g];
            return (
              <section key={g} className="flex flex-col gap-4">
                <header className="flex items-baseline justify-between">
                  <div className="flex flex-col gap-0.5">
                    <h2
                      className="text-[12px] font-semibold tracking-tight"
                      style={{ color: 'var(--fg-strong)' }}
                    >
                      {meta.title}
                    </h2>
                    <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                      {meta.hint}
                    </span>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-[0.14em] font-medium tabular-nums"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {items.length}
                  </span>
                </header>

                <div
                  className="grid grid-cols-3 gap-px rounded-md overflow-hidden"
                  style={{ background: 'var(--border-muted)' }}
                >
                  {items.map((e) => (
                    <CatalogCell key={e.id} entry={e} isDark={isDark} />
                  ))}
                </div>
              </section>
            );
          })}

          {filtered.length === 0 && (
            <div
              className="text-center py-16 text-[12px]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              No entries match &quot;{q}&quot;.
            </div>
          )}
        </div>
      </div>
    </ScrollPane>
  );
}

function CatalogCell({ entry, isDark }: { entry: CatalogEntry; isDark: boolean }) {
  const live = entry.status === 'live';
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';
  const innerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const onEnter = () => { if (live) el.style.background = 'var(--bg-hover)'; };
    const onLeave = () => { if (live) el.style.background = pageBg; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [live, pageBg]);

  const inner = (
    <div
      ref={innerRef}
      className="group flex flex-col gap-2 p-4 h-full transition-colors"
      style={{ background: pageBg }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[12px] font-semibold leading-snug"
          style={{ color: live ? 'var(--fg-strong)' : 'var(--fg-muted)' }}
        >
          {entry.title}
        </span>
        <StatusPill status={entry.status} />
      </div>
      <span
        className="text-[11px] leading-snug"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {entry.blurb}
      </span>
      <div className="flex items-center justify-between mt-1">
        <code
          className="text-[10px] font-mono tabular-nums truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {entry.path}
        </code>
        {live ? (
          <ArrowUpRight
            className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            style={{ color: 'var(--fg-link)' }}
          />
        ) : (
          <Lock className="w-3 h-3 opacity-50 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
        )}
      </div>
    </div>
  );

  if (live) {
    // Some entries carry query strings (e.g. /onboarding?step=2). TanStack's
    // typed `<Link to>` only accepts pathnames, so fall back to a native
    // anchor when a `?` is present — full client navigation still works
    // because the router catches it on mount.
    if (entry.path.includes('?')) {
      return (
        <a href={entry.path} className="contents">
          {inner}
        </a>
      );
    }
    return (
      <Link to={entry.path} className="contents">
        {inner}
      </Link>
    );
  }
  return inner;
}

const STATUS_META: Record<CatalogStatus, { label: string; fg: string }> = {
  live:    { label: 'Live',    fg: 'var(--intent-success-fg)' },
  stub:    { label: 'Stub',    fg: 'var(--intent-warning-fg)' },
  planned: { label: 'Planned', fg: 'var(--fg-subtle)' },
};

function StatusPill({ status }: { status: CatalogStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.14em] font-semibold shrink-0"
      style={{ color: m.fg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: m.fg }}
        aria-hidden
      />
      {m.label}
    </span>
  );
}
