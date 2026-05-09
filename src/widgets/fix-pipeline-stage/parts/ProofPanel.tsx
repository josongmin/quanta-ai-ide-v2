import type { TFunction } from 'i18next';
import type { ObligationCategory, ProofObligation, ValidationResult } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  validation: ValidationResult;
  t: TFunction;
  validationStatus: 'idle' | 'running' | 'done';
  onRunValidation: () => void;
};

const CATEGORY_ORDER: ObligationCategory[] = ['static', 'dynamic', 'stylistic', 'human'];

export function ProofPanel({ validation, t, validationStatus, onRunValidation }: Props) {
  const grouped: Record<ObligationCategory, ProofObligation[]> = {
    static: [],
    dynamic: [],
    stylistic: [],
    human: [],
  };
  for (const ob of validation.obligations) {
    grouped[ob.category].push(ob);
  }

  return (
    <GlassCard className="rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <SectionHeader title={t('proof.header')} />
        <button
          type="button"
          onClick={onRunValidation}
          disabled={validationStatus === 'running'}
          className="text-[10px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-md transition-colors"
          style={{
            background: validationStatus === 'running' ? 'var(--bg-surface-muted)' : 'var(--bg-active)',
            color: 'var(--fg-strong)',
            border: '1px solid var(--border-default)',
            opacity: validationStatus === 'running' ? 0.6 : 1,
            cursor: validationStatus === 'running' ? 'not-allowed' : 'pointer',
          }}
        >
          {validationStatus === 'running'
            ? t('proof.running')
            : validationStatus === 'done'
              ? t('proof.ranOnce')
              : t('proof.runValidation')}
        </button>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {CATEGORY_ORDER.map((cat) => {
          const list = grouped[cat];
          if (list.length === 0) return null;
          return (
            <div key={cat}>
              <h4
                className="text-[9px] font-black uppercase tracking-[0.18em] mb-1"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {t(`proof.${cat}`)}
              </h4>
              <ul className="flex flex-col gap-1">
                {list.map((ob) => (
                  <li
                    key={ob.id}
                    className="rounded-md px-2 py-1.5"
                    style={{
                      background: 'var(--bg-surface-muted)',
                      border: '1px solid var(--border-muted)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--fg-default)' }}>
                        {ob.label}
                      </div>
                      <StatusBadge status={ob.status} t={t} />
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      {ob.rationale}
                    </div>
                    {ob.detail !== undefined && (
                      <div
                        className="text-[10px] font-mono mt-0.5"
                        style={{ color: 'var(--fg-subtle)' }}
                      >
                        {ob.detail}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function StatusBadge({ status, t }: { status: ProofObligation['status']; t: TFunction }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className="text-[8px] font-black uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-md"
      style={{
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {t(`proof.status.${status}`)}
    </span>
  );
}

const STATUS_COLORS: Record<
  ProofObligation['status'],
  { bg: string; fg: string; border: string }
> = {
  pass: {
    bg: 'var(--intent-success-vivid)',
    fg: 'var(--bg-canvas)',
    border: 'var(--intent-success-vivid)',
  },
  fail: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-strong)',
    border: 'var(--fg-strong)',
  },
  unknown: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-default)',
    border: 'var(--border-default)',
  },
  pending: {
    bg: 'var(--bg-surface-muted)',
    fg: 'var(--fg-subtle)',
    border: 'var(--border-muted)',
  },
};
