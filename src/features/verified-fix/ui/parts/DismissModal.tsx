import { useRef, useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { ModalBackdrop, useDialogA11y } from '@shared/ui';
import type { CandidateFix } from '../../model/types';
import { useVfx } from './tokens';

const REASONS = [
  'wrong-root-cause',
  'too-broad-blast',
  'breaks-convention',
  'unsafe-during-rollout',
  'reviewer-disagrees',
] as const;

export function DismissModal({
  candidate, open, onCancel, onConfirm,
}: {
  candidate: CandidateFix | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (reasonTag: string, note: string) => void;
}) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  const dialogRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState<string>('');

  // Escape-to-close + focus trap/restore now come from the shared dialog
  // a11y hook instead of an inline onKeyDown on the backdrop button.
  useDialogA11y(dialogRef, open, onCancel);

  useEffect(() => {
    // Reset form fields when the modal opens; safe because `open` is the
    // sole dependency and the reset is idempotent — equivalent to a
    // `key={open}` remount but cheaper than rebuilding the dialog tree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setReason(REASONS[0]); setNote(''); }
  }, [open]);

  if (!open || !candidate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <ModalBackdrop
        onClick={onCancel}
        z="z-40"
        blur="sm"
        alpha={0.55}
        label="Close dialog"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Dismiss candidate fix"
        className="relative z-50 w-[480px] max-w-[92vw] rounded-lg border overflow-hidden"
        style={{
          background: t.cardBacking,
          borderColor: t.border,
          boxShadow: '0 20px 60px -12px rgba(0,0,0,0.55)',
        }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ background: t.inset, borderColor: t.borderSoft }}
        >
          <Trash2 className="w-3.5 h-3.5" style={{ color: t.textMuted }} />
          <span
            className="text-xs font-black uppercase tracking-eyebrow"
            style={{ color: t.textMuted }}
          >
            {tr('dismissModal.title')}
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label={tr('common:close')}
            className="ml-auto rounded p-1 transition-colors"
            style={{ color: t.textMuted }}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="text-sm mb-1" style={{ color: t.textMuted }}>
              {tr('dismissModal.dismissing')}
            </div>
            <div className="text-base font-semibold" style={{ color: t.textHi }}>
              {candidate.title}
            </div>
            <div className="text-sm mt-1" style={{ color: t.textFaint }}>
              {tr('dismissModal.feedbackHint')}
            </div>
          </div>

          {/* reason chips */}
          <div>
            <div className="text-2xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: t.textFaint }}>
              {tr('dismissModal.reasonTag')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => {
                const active = r === reason;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setReason(r); }}
                    className="text-xs font-mono px-2 py-1 rounded transition-colors"
                    style={{
                      background: active ? t.accentSoft : t.badgeBg,
                      color: active ? t.accent : t.textMuted,
                      border: `1px solid ${active ? t.accent + '60' : t.borderHair}`,
                    }}
                  >
                    {tr(`dismissModal.reason.${r}`, { defaultValue: r })}
                  </button>
                );
              })}
            </div>
          </div>

          {/* note */}
          <div>
            <div className="text-2xs font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: t.textFaint }}>
              {tr('dismissModal.optionalNote')}
            </div>
            <textarea
              value={note}
              onChange={(e) => { setNote(e.target.value); }}
              placeholder={tr('dismissModal.notePlaceholder')}
              rows={3}
              className="w-full rounded border px-2.5 py-2 text-sm font-mono outline-none transition-colors"
              style={{
                background: t.inset,
                color: t.textHi,
                borderColor: t.borderSoft,
                resize: 'vertical',
              }}
            />
          </div>

          {/* actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-3 py-1.5 text-sm font-bold uppercase tracking-eyebrow transition-colors"
              style={{ color: t.textMuted, border: `1px solid ${t.borderSoft}` }}
            >
              {tr('dismissModal.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { onConfirm(reason, note); }}
              className="rounded px-3 py-1.5 text-sm font-bold uppercase tracking-eyebrow transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
              style={{ background: t.bad, color: 'var(--fg-on-accent)' }}
            >
              <Trash2 className="w-3 h-3" /> {tr('dismissModal.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
