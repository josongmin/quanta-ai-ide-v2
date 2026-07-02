import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Section, Row, Button } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import { useGeneratedCodes, downloadCodes } from './types';

export function RecoverySection({ onShow }: { onShow: () => void }) {
  return (
    <Section
      title="Recovery codes"
      hint="Single-use codes that work if you lose access to all your 2FA methods. Store them somewhere safe."
    >
      <Row
        label="10 of 10 codes available"
        sub={<span>Last generated 2026-02-12. Each code is 12 alphanumeric characters and can be used once.</span>}
      >
        <Button leading={<RefreshCw className="w-3 h-3" />} onClick={onShow}>
          View / regenerate codes
        </Button>
      </Row>
    </Section>
  );
}

export function RecoveryCodesModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const codes = useGeneratedCodes(10);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-[480px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
            Save your recovery codes
          </h3>
          <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
            Each code can only be used once. Keep them somewhere outside this app — a password manager, printed copy, or encrypted note.
          </p>
        </div>
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-3 rounded-md font-mono text-[12px] tabular-nums"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-strong)',
          }}
        >
          {codes.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="md" onClick={() => { void navigator.clipboard?.writeText(codes.join('\n')); }}>
            Copy all
          </Button>
          <Button variant="secondary" size="md" onClick={() => { downloadCodes(codes); }}>
            Download .txt
          </Button>
          <Button variant="secondary" size="md" onClick={() => { window.print(); }}>
            Print
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved them</Button>
        </div>
      </div>
    </div>
  );
}
