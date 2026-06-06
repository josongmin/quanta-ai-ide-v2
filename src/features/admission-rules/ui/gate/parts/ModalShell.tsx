import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Portal, ModalBackdrop, useDialogA11y } from '@shared/ui';

// Shared modal chrome for the three ActionPlanCard drawers (fix / override /
// suppress). Centralises the dimmed backdrop, the titled header bar, and the
// close affordance so each drawer only declares its body.
//
// A11y: `useDialogA11y` handles ESC-to-close, focus trap, auto-focus on open,
// and focus restore to the opener on close. The backdrop uses the shared
// `ModalBackdrop` primitive.

export function ModalShell({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('admission');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <ModalBackdrop onClick={onClose} z="z-50" blur="sm" alpha={0.5} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className="relative w-[520px] max-w-[92vw] rounded-md overflow-hidden outline-none"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 h-11"
            style={{ borderBottom: '1px solid var(--border-default)' }}
          >
            <h3
              className="text-[12px] font-semibold uppercase tracking-[0.14em] flex-1"
              style={{ color: 'var(--fg-strong)' }}
            >
              {title}
            </h3>
            <CloseButton onClose={onClose} label={t('gate.modal.close')} />
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      aria-label={label}
      className="inline-flex items-center justify-center w-6 h-6 rounded transition-colors"
      style={{ color: 'var(--fg-subtle)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--fg-strong)';
        e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--fg-subtle)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

export const EXPIRY_OPTIONS = [
  { key: 'h24', ms: 1000 * 60 * 60 * 24 },
  { key: 'd7',  ms: 1000 * 60 * 60 * 24 * 7 },
  { key: 'd14', ms: 1000 * 60 * 60 * 24 * 14 },
  { key: 'd30', ms: 1000 * 60 * 60 * 24 * 30 },
] as const;
