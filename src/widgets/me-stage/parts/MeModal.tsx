import { useRef, type ReactNode } from 'react';
import { useDialogA11y } from '@shared/ui';

type Props = {
  onClose: () => void;
  /** Panel max-width Tailwind class, e.g. `max-w-[420px]`. */
  widthClass: string;
  /** Panel border colour token; defaults to the neutral `--border-default`. */
  borderColor?: string;
  /** Tall content that should scroll within the viewport. */
  scroll?: boolean;
  /** id of the panel's heading element, for aria-labelledby. */
  ariaLabelledby?: string;
  children: ReactNode;
};

// The me-stage modal chrome (scrim backdrop + elevated panel + focus-trap),
// extracted from seven byte-identical hand-rolls (api-tokens Create/Reveal/
// Revoke, connected-apps Remove, security AddMfa/Recovery, account Danger).
//
// Deliberately the me / billing / developer modal idiom (`--bg-scrim` +
// `--shadow-lg` + `popover-*-in` enter animations), NOT the shared settings-kit
// SettingsModal — those are a different idiom and must not be force-converted
// (see the settings-kit SSOT note). Escape / focus-trap / initial-focus /
// focus-restore are owned by useDialogA11y exactly as the hand-rolls had it, so
// this is a pure de-duplication with no behavior change.
export function MeModal({
  onClose,
  widthClass,
  borderColor = 'var(--border-default)',
  scroll = false,
  ariaLabelledby,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        tabIndex={-1}
        className={`w-full ${widthClass} rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none${scroll ? ' max-h-[90vh] overflow-y-auto' : ''}`}
        style={{
          background: 'var(--bg-elevated)',
          border: `1px solid ${borderColor}`,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
