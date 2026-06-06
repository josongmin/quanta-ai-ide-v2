import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

import { Button } from '../forms';

// Copyable code block used 4+ times (reveal-once secret value, invite link,
// webhook signing secret, endpoint IDs): a canvas-surfaced box holding a
// monospaced value plus a Copy button that briefly flips to a "Copied" check.
//
// Reproduces the RevealOnceModal markup exactly: a `p-2.5 rounded-md` box on
// `--bg-canvas` / `--border-default`, a `flex-1 font-mono text-[11px] break-all`
// code element in `--fg-strong`, and the shared <Button> with a Copy/Check
// leading glyph. Copy uses navigator.clipboard with a 1.5s "copied" window.

type Props = {
  value: string;
  /** Optional eyebrow label rendered above the box. */
  label?: ReactNode;
  /** Copy button text. Defaults to "Copy" / "Copied". */
  copyLabel?: string;
  copiedLabel?: string;
};

export function CopyableCode({
  value, label, copyLabel = 'Copy', copiedLabel = 'Copied',
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    try { void navigator.clipboard.writeText(value); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1500);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {label}
        </span>
      )}
      <div
        className="flex items-center gap-2 p-2.5 rounded-md"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <code className="flex-1 font-mono text-[11px] break-all" style={{ color: 'var(--fg-strong)' }}>
          {value}
        </code>
        <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copy}>
          {copied ? copiedLabel : copyLabel}
        </Button>
      </div>
    </div>
  );
}
