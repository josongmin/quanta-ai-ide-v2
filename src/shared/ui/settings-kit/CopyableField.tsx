import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

import { Button } from '../forms';

// Generalized copy-to-clipboard field. Consolidates the many hand-rolled
// "monospaced value + copy button that flips to a check" widgets across the
// settings / developer / onboarding surfaces.
//
// Two layouts:
//   • block — vertical: optional eyebrow label above a bordered value box
//             (the original CopyableCode shape).
//   • row   — horizontal: a single bordered pill with the value truncated on
//             the left and the copy control on the right.
//
// Two copy controls:
//   • text  — the shared <Button> with a Copy/Check glyph + "Copy"/"Copied".
//   • icon  — an icon-only button that toggles Copy → Check (no text).
//
// Copy uses navigator.clipboard with a ~1.5s "copied" window.

type Props = {
  value: string;
  /** Vertical box (default) or horizontal pill. */
  layout?: 'block' | 'row';
  /** Text button (default) or icon-only button. */
  button?: 'text' | 'icon';
  /** Optional eyebrow label. Rendered above the box in block layout. */
  label?: ReactNode;
  /** Copy button text (text button only). */
  copyLabel?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyableField({
  value,
  layout = 'block',
  button = 'text',
  label,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  className = '',
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    try { void navigator.clipboard.writeText(value); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => { setCopied(false); }, 1500);
  };

  if (layout === 'row') {
    // In-box, borderless copy control so it doesn't read as a nested pill
    // inside the already-bordered row.
    const rowControl =
      button === 'icon' ? (
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? copiedLabel : copyLabel}
          className="inline-flex items-center justify-center w-8 h-8 transition-colors shrink-0"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 h-9 px-3 text-[11px] font-semibold transition-colors shrink-0"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      );

    return (
      <div
        className={`flex items-center rounded-md overflow-hidden ${className}`}
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
      >
        <code className="flex-1 min-w-0 px-3 py-2 text-[11px] font-mono truncate" style={{ color: 'var(--fg-strong)' }}>
          {value}
        </code>
        {rowControl}
      </div>
    );
  }

  const copyControl =
    button === 'icon' ? (
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? copiedLabel : copyLabel}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0"
        style={{ color: 'var(--fg-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    ) : (
      <Button leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} onClick={copy}>
        {copied ? copiedLabel : copyLabel}
      </Button>
    );

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {label}
        </span>
      )}
      <div
        className="flex items-center gap-2 p-2.5 rounded-md"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <code className="flex-1 min-w-0 font-mono text-[11px] break-all" style={{ color: 'var(--fg-strong)' }}>
          {value}
        </code>
        {copyControl}
      </div>
    </div>
  );
}
