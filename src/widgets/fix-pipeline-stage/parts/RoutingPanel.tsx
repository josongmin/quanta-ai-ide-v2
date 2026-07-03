import type { TFunction } from 'i18next';
import type { ReviewerRef, ReviewerSuggestion } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  routing: ReviewerSuggestion;
  t: TFunction;
};

// Reviewer routing — Phase 2. Primary handle + fallback chain so the user
// sees who to ping *and* why, plus alternatives if primary is overloaded.
export function RoutingPanel({ routing, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('routing.header')} />
      <div
        className="rounded-md px-2 py-2 mt-1.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="text-2xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
          {t('routing.primary')}
        </div>
        <ReviewerLine reviewer={routing.primary} t={t} />
      </div>

      <div className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {routing.rationale}
      </div>

      {routing.fallbacks.length > 0 && (
        <div className="mt-2">
          <div
            className="text-2xs font-black uppercase tracking-eyebrow mb-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('routing.fallbacks')}
          </div>
          <ul className="flex flex-col gap-1">
            {routing.fallbacks.map((r) => (
              <li
                key={r.handle}
                className="rounded-md px-2 py-1"
                style={{ background: 'var(--bg-surface-muted)' }}
              >
                <ReviewerLine reviewer={r} t={t} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

function ReviewerLine({ reviewer, t }: { reviewer: ReviewerRef; t: TFunction }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-base font-mono" style={{ color: 'var(--fg-strong)' }}>
        {reviewer.handle}
      </span>
      <span className="flex items-center gap-1.5 text-2xs" style={{ color: 'var(--fg-muted)' }}>
        <span className="font-black uppercase tracking-eyebrow">{reviewer.role}</span>
        <span>·</span>
        <span>{t(`routing.load.${reviewer.load}`)}</span>
      </span>
    </div>
  );
}
