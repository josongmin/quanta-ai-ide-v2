import type { TFunction } from 'i18next';
import type { FixCandidate } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  rejected: FixCandidate[];
  t: TFunction;
};

// "Recommended 1 + why the others lost" — the design rule is no equal
// lineup. Reviewers shouldn't pick from a menu; they should audit a
// recommendation. This panel shows *why* alternatives were ranked lower.
export function RejectedAlternatives({ rejected, t }: Props) {
  if (rejected.length === 0) {
    return (
      <GlassCard className="rounded-lg p-4">
        <SectionHeader title={t('rejected.header')} />
        <p className="text-sm mt-1" style={{ color: 'var(--fg-subtle)' }}>
          {t('rejected.empty')}
        </p>
      </GlassCard>
    );
  }
  return (
    <GlassCard className="rounded-lg p-4">
      <SectionHeader title={t('rejected.header')} />
      <ul className="flex flex-col gap-2 mt-2">
        {rejected.map((c) => (
          <li
            key={c.id}
            className="rounded-md p-2"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--fg-default)' }}>
              {c.title}
            </div>
            {c.rejectedReason !== undefined && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                {c.rejectedReason}
              </div>
            )}
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
