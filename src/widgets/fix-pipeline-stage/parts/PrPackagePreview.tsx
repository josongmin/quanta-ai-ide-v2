import type { TFunction } from 'i18next';
import type {
  ConfidenceScore,
  DeliveryDecision,
  FixCandidate,
  ValidationResult,
} from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  candidate: FixCandidate;
  validation: ValidationResult;
  decision: DeliveryDecision;
  confidence: ConfidenceScore;
  t: TFunction;
};

// Concise package — what the reviewer sees if this draft PR is created.
// Per the spec: proposer/approver/validated/unverified are explicit so
// responsibility is never ambiguous. Unverified items are listed even
// though the gate may say "guarded": the reviewer must see *what was not
// checked* in the same panel as *what was*.
export function PrPackagePreview({ candidate, validation, decision, confidence, t }: Props) {
  const passed = validation.obligations.filter((ob) => ob.status === 'pass');
  const unverified = validation.obligations.filter(
    (ob) => ob.status === 'pending' || ob.status === 'unknown' || ob.status === 'fail',
  );

  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('pr.header')} badge={t(`gate.tier.${decision.tier}`)} />

      <div className="mt-2">
        <h4
          className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('pr.summary')}
        </h4>
        <p className="text-sm" style={{ color: 'var(--fg-default)' }}>
          {candidate.title}
        </p>
      </div>

      <div className="mt-2">
        <h4
          className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('pr.why')}
        </h4>
        <p className="text-sm" style={{ color: 'var(--fg-default)' }}>
          {candidate.rationale}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <h4
            className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('pr.validated')}
          </h4>
          <ul className="flex flex-col gap-0.5">
            {passed.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--fg-subtle)' }}>—</li>
            )}
            {passed.map((ob) => (
              <li key={ob.id} className="text-xs" style={{ color: 'var(--fg-default)' }}>
                ✓ {ob.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4
            className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('pr.unverified')}
          </h4>
          <ul className="flex flex-col gap-0.5">
            {unverified.length === 0 && (
              <li className="text-xs" style={{ color: 'var(--fg-subtle)' }}>—</li>
            )}
            {unverified.map((ob) => (
              <li key={ob.id} className="text-xs" style={{ color: 'var(--fg-default)' }}>
                · {ob.label} ({ob.status})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className="mt-3 pt-2 flex items-center justify-between text-xs font-mono"
        style={{ color: 'var(--fg-subtle)', borderTop: '1px solid var(--border-muted)' }}
      >
        <span>{t('pr.proposer')}</span>
        <span>conf {(confidence.numeric * 100).toFixed(0)}%</span>
        <span>{t('pr.approver')}</span>
      </div>
    </GlassCard>
  );
}
