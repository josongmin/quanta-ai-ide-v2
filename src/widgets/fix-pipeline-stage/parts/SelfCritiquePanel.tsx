import type { TFunction } from 'i18next';
import type { CritiqueIteration } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  history: CritiqueIteration[];
  t: TFunction;
};

// Self-healing loop history — Phase 3. Honest audit trail of "iter N
// failed because X, iter N+1 adjusted by Y". Without this the loop just
// looks like the system tried again without any reasoning.
export function SelfCritiquePanel({ history, t }: Props) {
  if (history.length === 0) return null;
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('critique.header')} badge={`${history.length.toString()} iter`} />
      <ul className="flex flex-col gap-2 mt-2">
        {history.map((h) => (
          <li
            key={`${h.candidateIdAfter}-${h.iteration.toString()}`}
            className="rounded-md p-2"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <div
              className="text-2xs font-black uppercase tracking-eyebrow"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('critique.iteration', { n: h.iteration })}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              {t('critique.failed')}
            </div>
            <div className="text-sm" style={{ color: 'var(--fg-default)' }}>
              {h.failureSummary}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              {t('critique.adjusted')}
            </div>
            <div className="text-sm" style={{ color: 'var(--fg-default)' }}>
              {h.adjustment}
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
