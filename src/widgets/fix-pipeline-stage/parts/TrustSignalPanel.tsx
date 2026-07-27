import { useState } from 'react';
import type { TFunction } from 'i18next';
import type { CandidateDismissal, ConfidenceScore, DismissReason } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';
import { levelLabel } from '@features/fix-pipeline';

type Props = {
  candidateId: string;
  confidence: ConfidenceScore;
  dismissal: CandidateDismissal | null;
  onDismiss: (reason: DismissReason, note?: string) => void;
  t: TFunction;
};

const REASONS: DismissReason[] = ['wrong-root-cause', 'too-broad', 'breaks-style', 'risky', 'other'];

export function TrustSignalPanel({ confidence, dismissal, onDismiss, t }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DismissReason>('wrong-root-cause');
  const [note, setNote] = useState('');

  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('trust.header')} />

      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
          {t('trust.level')}
        </span>
        <span className="text-base font-bold" style={{ color: 'var(--fg-strong)' }}>
          {levelLabel(confidence.level)}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
          {t('trust.score')}
        </span>
        <span className="text-base font-mono" style={{ color: 'var(--fg-default)' }}>
          {(confidence.numeric * 100).toFixed(0)}%
        </span>
      </div>

      <div className="mt-2 rounded-md p-2" style={{ background: 'var(--bg-surface-muted)' }}>
        <div className="text-2xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
          {t('trust.weakest')}
        </div>
        <div className="text-sm mt-0.5" style={{ color: 'var(--fg-default)' }}>
          {confidence.weakestObligation}
        </div>
      </div>

      {dismissal ? (
        <div
          className="mt-2 rounded-md p-2"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          <div className="text-xs font-black uppercase tracking-eyebrow" style={{ color: 'var(--fg-subtle)' }}>
            {t('trust.dismissed')}
          </div>
          <div className="text-sm mt-0.5" style={{ color: 'var(--fg-default)' }}>
            {t(`trust.dismissReason.${dismissal.reason}`)}
          </div>
          {dismissal.note !== undefined && dismissal.note.length > 0 && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {dismissal.note}
            </div>
          )}
        </div>
      ) : open ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <select
            value={reason}
            onChange={(e) => { setReason(e.target.value as DismissReason); }}
            className="text-sm rounded-md px-2 py-1"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>{t(`trust.dismissReason.${r}`)}</option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => { setNote(e.target.value); }}
            placeholder="(optional note)"
            className="text-sm rounded-md px-2 py-1"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                onDismiss(reason, note.length > 0 ? note : undefined);
                setOpen(false);
                setNote('');
              }}
              className="flex-1 text-xs font-black uppercase tracking-eyebrow px-2 py-1 rounded-md"
              style={{
                background: 'var(--bg-active)',
                color: 'var(--fg-strong)',
                border: '1px solid var(--border-default)',
              }}
            >
              {t('trust.dismiss')}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); }}
              className="text-xs font-bold uppercase tracking-eyebrow px-2 py-1 rounded-md"
              style={{
                background: 'transparent',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(true); }}
          className="mt-2 w-full text-xs font-black uppercase tracking-eyebrow px-2 py-1.5 rounded-md transition-colors"
          style={{
            background: 'transparent',
            color: 'var(--fg-default)',
            border: '1px solid var(--border-default)',
          }}
        >
          {t('trust.dismiss')}
        </button>
      )}
    </GlassCard>
  );
}
