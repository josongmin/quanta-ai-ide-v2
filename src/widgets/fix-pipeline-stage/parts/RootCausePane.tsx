import type { TFunction } from 'i18next';
import type { FixCandidate, FixSeed } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  seed: FixSeed;
  candidate: FixCandidate;
  t: TFunction;
};

export function RootCausePane({ seed, candidate, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-4">
      <SectionHeader title={t('rootCause.header')} />
      <p className="text-base leading-relaxed mt-1" style={{ color: 'var(--fg-default)' }}>
        {seed.suspectedRootCause ?? seed.symptom}
      </p>

      <div className="mt-4">
        <h4
          className="text-xs font-black uppercase tracking-eyebrow mb-1.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          {t('rootCause.rationale')}
        </h4>
        <p className="text-base leading-relaxed" style={{ color: 'var(--fg-default)' }}>
          {candidate.rationale}
        </p>
      </div>

      <div className="mt-4">
        <h4
          className="text-xs font-black uppercase tracking-eyebrow mb-1.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          {t('rootCause.evidence')}
        </h4>
        <ul className="flex flex-col gap-1">
          {seed.evidenceRefs.map((ref, i) => (
            <li
              key={`${ref.kind}-${i.toString()}`}
              className="text-sm font-mono px-2 py-1 rounded-md"
              style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-default)' }}
            >
              <span
                className="text-2xs font-black uppercase tracking-eyebrow mr-2"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {ref.kind}
              </span>
              {ref.label}
            </li>
          ))}
        </ul>
      </div>

      {seed.constraints && (
        <div className="mt-4">
          <h4
            className="text-xs font-black uppercase tracking-eyebrow mb-1.5"
            style={{ color: 'var(--fg-muted)' }}
          >
            {t('rootCause.constraints')}
          </h4>
          <div className="flex gap-1.5 flex-wrap">
            {seed.constraints.publicApi === true && (
              <span
                className="text-xs font-bold uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-default)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {t('rootCause.constraintPublic')}
              </span>
            )}
            {seed.constraints.securityPath === true && (
              <span
                className="text-xs font-bold uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-default)',
                  border: '1px solid var(--border-default)',
                }}
              >
                {t('rootCause.constraintSecurity')}
              </span>
            )}
            {(seed.constraints.forbidden ?? []).map((f) => (
              <span
                key={f}
                className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
