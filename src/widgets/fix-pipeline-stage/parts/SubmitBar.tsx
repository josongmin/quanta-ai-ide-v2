import type { TFunction } from 'i18next';
import type { DeliveryDecision, PermissionLedger, SubmissionRecord } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';
import { decideSubmissionAction } from '@features/fix-pipeline';

type Props = {
  candidateId: string;
  decision: DeliveryDecision;
  permissions: PermissionLedger;
  submission: SubmissionRecord | null;
  onSubmit: () => void;
  t: TFunction;
};

// Submission action — Phase 2 manual + Phase 3 auto. Button label is
// driven by the (tier, permissions) decision so users can never
// accidentally bypass the gate. PR description in the resulting record
// names proposer/approver explicitly per the spec's responsibility-split
// requirement.
export function SubmitBar({
  decision, permissions, submission, onSubmit, t,
}: Props) {
  const action = decideSubmissionAction(decision, permissions);
  const status = submission?.status ?? 'unsubmitted';

  if (status === 'auto-submitted' || status === 'manually-submitted') {
    return (
      <GlassCard className="rounded-lg p-3">
        <SectionHeader title={t('submit.header')} badge={t(`submit.status.${status}`)} />
        <div
          className="mt-2 rounded-md px-2 py-2 text-sm"
          style={{
            background: 'var(--bg-active)',
            color: 'var(--fg-strong)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="font-bold">PR #{submission?.prNumber?.toString() ?? ''}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
            {t('submit.proposerLine', { by: submission?.submittedBy ?? 'system' })}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('submit.header')} />

      <button
        type="button"
        onClick={onSubmit}
        disabled={action.kind === 'blocked' || status === 'submitting'}
        className="mt-2 w-full text-sm font-black uppercase tracking-eyebrow px-3 py-2 rounded-md transition-colors"
        style={{
          background: action.kind === 'blocked' ? 'var(--bg-surface-muted)' : 'var(--bg-active)',
          color: action.kind === 'blocked' ? 'var(--fg-subtle)' : 'var(--fg-strong)',
          border: '1px solid var(--border-default)',
          opacity: action.kind === 'blocked' || status === 'submitting' ? 0.6 : 1,
          cursor: action.kind === 'blocked' || status === 'submitting' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'submitting'
          ? t('submit.submitting')
          : action.kind === 'auto-submit'
            ? t('submit.auto')
            : action.kind === 'manual-submit'
              ? t('submit.manual')
              : t('submit.blocked')}
      </button>

      <div className="mt-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {action.reason}
      </div>
    </GlassCard>
  );
}
