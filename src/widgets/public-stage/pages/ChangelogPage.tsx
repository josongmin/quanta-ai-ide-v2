import { useMemo, useState } from 'react';
import { PublicShell , HeroBackdrop, Eyebrow, HeadlineGradient } from '@shared/ui/marketing';
import { ENTRIES } from '../parts/changelog/data';
import type { Category } from '../parts/changelog/types';
import { SubscribeForm } from '../parts/changelog/SubscribeForm';
import { FilterChips } from '../parts/changelog/FilterChips';
import { TimelineEntry } from '../parts/changelog/TimelineEntry';
import { TocAside } from '../parts/changelog/TocAside';

export default function ChangelogPage() {
  const [filter, setFilter] = useState<'All' | Category>('All');

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
          <SubscribeForm />
        </div>
      </section>

      {/* ─── BODY: timeline + sticky TOC ────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 pb-24">
        <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 240px' }}>
          {/* Timeline */}
          <div className="min-w-0">
            {/* Filter chips */}
            <FilterChips filter={filter} counts={counts} onChange={setFilter} />

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
          <TocAside />
        </div>
      </section>
    </PublicShell>
  );
}
