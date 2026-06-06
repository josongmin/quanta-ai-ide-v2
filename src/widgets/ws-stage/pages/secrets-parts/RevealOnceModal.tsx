import { Check } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { CopyableCode } from '@shared/ui';

// NOTE: This panel intentionally stays hand-rolled rather than using SettingsModal:
// it has no header/close-X, uses a heavier opaque backdrop (rgba 0.55, no
// ModalBackdrop/blur), and a single primary-only footer — none of which
// SettingsModal reproduces. Only the value box matches the kit, so just that is
// swapped for <CopyableCode />.
export function RevealOnceModal({
  name, value, onClose,
}: { name: string; value: string; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
            <span className="text-[12px] font-semibold font-mono" style={{ color: 'var(--fg-strong)' }}>
              {name} stored
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Copy this value now — for security, it can&apos;t be shown again. You can rotate to generate a new one later.
          </p>
          <CopyableCode value={value} />
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </>
  );
}
