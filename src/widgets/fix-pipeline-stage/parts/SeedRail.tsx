import type { TFunction } from 'i18next';
import type { CandidateDismissal, FixCandidate, FixSeed } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  seeds: FixSeed[];
  selectedSeedId: string | null;
  onSelectSeed: (id: string) => void;
  candidates: FixCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string) => void;
  dismissals: CandidateDismissal[];
  generationStatus: 'idle' | 'generating' | 'ready' | 'rejected';
  generationError: string | null;
  t: TFunction;
};

export function SeedRail({
  seeds,
  selectedSeedId,
  onSelectSeed,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  dismissals,
  generationStatus,
  generationError,
  t,
}: Props) {
  const dismissedIds = new Set(dismissals.map((d) => d.candidateId));
  return (
    <aside
      className="shrink-0 h-full overflow-auto p-3 flex flex-col gap-3 border-r"
      style={{ width: 260, borderColor: 'var(--border-muted)', background: 'var(--bg-canvas)' }}
    >
      <GlassCard className="rounded-lg p-3">
        <SectionHeader title={t('seedRail.header')} />
        <ul className="flex flex-col gap-1.5 mt-1">
          {seeds.map((seed) => {
            const selected = seed.id === selectedSeedId;
            return (
              <li key={seed.id}>
                <button
                  type="button"
                  onClick={() => { onSelectSeed(seed.id); }}
                  className="w-full text-left rounded-md px-2 py-2 transition-colors"
                  style={{
                    // Selection = brand-fg inset ring, never a grey fill.
                    background: 'transparent',
                    color: selected ? 'var(--fg-strong)' : 'var(--fg-default)',
                    border: '1px solid transparent',
                    boxShadow: selected ? 'inset 0 0 0 1px var(--fg-accent)' : undefined,
                  }}
                >
                  <div className="text-sm font-bold mb-0.5">{seed.kind.toUpperCase()}</div>
                  <div className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
                    {seed.symptom}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </GlassCard>

      <GlassCard className="rounded-lg p-3">
        <SectionHeader title={t('seedRail.candidatesHeader')} />
        {generationStatus === 'idle' && (
          <p className="text-sm mt-1" style={{ color: 'var(--fg-subtle)' }}>
            {t('seedRail.noSeed')}
          </p>
        )}
        {generationStatus === 'generating' && (
          <p className="text-sm mt-1" style={{ color: 'var(--fg-subtle)' }}>
            {t('seedRail.generating')}
          </p>
        )}
        {generationStatus === 'rejected' && (
          <div
            className="rounded-md border p-2 mt-1"
            style={{
              borderColor: 'var(--border-default)',
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
            }}
          >
            <div className="text-sm font-bold">{t('seedRail.rejected')}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {generationError ?? t('seedRail.rejectedHint')}
            </div>
          </div>
        )}
        {generationStatus === 'ready' && (
          <ul className="flex flex-col gap-1.5 mt-1">
            {candidates.map((c) => {
              const selected = c.id === selectedCandidateId;
              const dismissed = dismissedIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => { onSelectCandidate(c.id); }}
                    className="w-full text-left rounded-md px-2 py-2 transition-colors"
                    style={{
                      // Selection = brand-fg inset ring, never a grey fill.
                      background: 'transparent',
                      color: dismissed ? 'var(--fg-subtle)' : 'var(--fg-default)',
                      opacity: dismissed ? 0.6 : 1,
                      border: '1px solid transparent',
                      boxShadow: selected ? 'inset 0 0 0 1px var(--fg-accent)' : undefined,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {c.isRecommended && (
                        <span
                          className="text-2xs font-black uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md"
                          style={{
                            background: 'var(--intent-success-vivid)',
                            color: 'var(--bg-canvas)',
                          }}
                        >
                          {t('seedRail.recommended')}
                        </span>
                      )}
                      {!c.isRecommended && (
                        <span
                          className="text-2xs font-black uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md"
                          style={{
                            background: 'var(--bg-surface-muted)',
                            color: 'var(--fg-subtle)',
                            border: '1px solid var(--border-muted)',
                          }}
                        >
                          {t('seedRail.rejectedTag')}
                        </span>
                      )}
                      {dismissed && (
                        <span
                          className="text-2xs font-bold uppercase tracking-eyebrow"
                          style={{ color: 'var(--fg-subtle)' }}
                        >
                          · {t('seedRail.dismissed')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Δ {c.metrics.linesChanged} lines · {c.metrics.filesChanged}f · {c.metrics.modulesAffected}m
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </aside>
  );
}
