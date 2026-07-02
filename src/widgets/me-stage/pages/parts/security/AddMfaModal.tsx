import { useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import type { MfaKind, MfaMethod } from './types';

export function AddMfaModal({
  kind, onClose, onAdded,
}: {
  kind: MfaKind;
  onClose: () => void;
  onAdded: (m: MfaMethod) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const [label, setLabel] = useState(kind === 'totp' ? '1Password' : 'YubiKey');
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
        className="w-full max-w-[400px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Add {kind === 'totp' ? 'authenticator app' : 'security key'}
        </h3>

        {kind === 'totp' ? (
          <div className="flex flex-col gap-3">
            <div
              className="aspect-square w-32 mx-auto p-2 rounded"
              style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
            >
              <QrPlaceholder />
            </div>
            <p className="text-[11px] leading-snug text-center" style={{ color: 'var(--fg-muted)' }}>
              Scan with 1Password, Authy, Google Authenticator, or similar.
              Then enter the 6-digit code it generates.
            </p>
            <input
              placeholder="6-digit code"
              maxLength={6}
              inputMode="numeric"
              className="h-10 px-3 rounded-md text-[15px] font-mono tabular-nums tracking-wider text-center outline-none"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
                border: '1.5px solid var(--fg-accent)',
              }}
            >
              <span className="absolute rounded-full onb-pulse-ring" style={{ width: 56, height: 56 }} aria-hidden />
              <ShieldCheck className="w-6 h-6" style={{ color: 'var(--fg-accent)' }} />
            </div>
            <p className="text-[11px] leading-snug text-center" style={{ color: 'var(--fg-muted)' }}>
              Touch your security key or use Touch ID / Windows Hello to register.
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Label
          </span>
          <input
            value={label}
            onChange={(e) => { setLabel(e.target.value); }}
            placeholder="e.g. 1Password"
            className="h-9 px-3 rounded-md text-[12px] outline-none"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const newMethod: MfaMethod = {
                id: `m_${Date.now()}`,
                kind,
                label: label.trim() || (kind === 'totp' ? 'Authenticator' : 'Security key'),
                added: new Date().toISOString().slice(0, 10),
                lastUsed: 'just now',
                primary: false,
              };
              onAdded(newMethod);
            }}
          >
            Add method
          </Button>
        </div>
      </div>
    </div>
  );
}

function QrPlaceholder() {
  // Tiny pseudo-QR using SVG noise. Not a real QR; visual stand-in only.
  const cells = Array.from({ length: 25 * 25 }, (_, i) => ((i * 37 + (i >> 5) * 13) % 7 < 3));
  return (
    <svg viewBox="0 0 25 25" className="w-full h-full">
      {cells.map((on, i) => (
        on ? (
          <rect
            key={i}
            x={i % 25} y={Math.floor(i / 25)} width="1" height="1"
            fill="var(--fg-strong)"
          />
        ) : null
      ))}
      {/* Finder squares */}
      {[[0, 0], [18, 0], [0, 18]].map(([x, y], k) => (
        <g key={k}>
          <rect x={x} y={y} width="7" height="7" fill="var(--fg-strong)" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--bg-canvas)" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--fg-strong)" />
        </g>
      ))}
    </svg>
  );
}
