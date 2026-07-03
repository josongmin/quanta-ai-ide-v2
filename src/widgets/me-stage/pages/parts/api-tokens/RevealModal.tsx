import { useMemo, useRef, useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { useDialogA11y } from '@shared/ui';
import { useCopyToClipboard } from '@shared/lib';
import type { Token } from './types';

export function RevealModal({ token, onClose }: { token: Token; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const fullToken = useMemo(() => {
    // Demo: deterministic-ish full token. Real systems hash + only show on creation.
    const seedRef = { s: 0 };
    for (let i = 0; i < token.prefix.length; i++) {
      seedRef.s = (seedRef.s * 31 + token.prefix.charCodeAt(i)) >>> 0;
    }
    const rand = () => {
      seedRef.s = (seedRef.s * 9301 + 49297) % 233280;
      return seedRef.s / 233280;
    };
    const tail = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(rand() * 36)]).join('');
    return `${token.prefix}${tail}`;
  }, [token.prefix]);
  const [shown, setShown] = useState(true);
  const { copied, copy } = useCopyToClipboard(1500);

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
        className="w-full max-w-[520px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--fg-accent)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
          >
            <Key className="w-4 h-4" style={{ color: 'var(--fg-accent)' }} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              Save your new token
            </h3>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
              <span className="font-semibold">This is the only time we&apos;ll show it.</span>{' '}
              Once you close this dialog, only the prefix is visible.
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 p-2 rounded-md font-mono text-sm tabular-nums"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <code className="flex-1 truncate" style={{ color: 'var(--fg-strong)' }}>
            {shown ? fullToken : `${token.prefix}${'•'.repeat(28)}`}
          </code>
          <button
            type="button"
            onClick={() => { setShown((v) => !v); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--fg-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            aria-label={shown ? 'Hide' : 'Show'}
          >
            {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => { copy(fullToken); }}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-sm font-medium transition-colors"
            style={{
              background: copied ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              color: copied ? 'var(--intent-success-fg)' : 'var(--fg-default)',
              border: `1px solid ${copied ? 'var(--intent-success-fg)' : 'var(--border-default)'}`,
            }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="flex flex-col gap-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
          <div><span style={{ color: 'var(--fg-strong)' }}>{token.name}</span> · {token.scopes.length} scope{token.scopes.length === 1 ? '' : 's'}</div>
          <div>Expires {token.expiresAt ?? 'never'}</div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="primary" size="md" onClick={onClose}>I&apos;ve saved it</Button>
        </div>
      </div>
    </div>
  );
}
