import { useState } from 'react';
import { Link2, Check, Copy, RotateCcw } from 'lucide-react';
import type { WizardData } from '../../wizard';

// Magic invite link — generate, copy, regenerate.
export function InviteLinkPanel({
  value, onGenerate,
}: { value: WizardData['invite']; onGenerate: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value.inviteLink) return;
    try {
      await navigator.clipboard.writeText(value.inviteLink);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    } catch { /* ignore */ }
  };

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <Link2 className="w-3 h-3" style={{ color: 'var(--fg-muted)' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          Or share an invite link
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          · expires in 7 days · max 50 uses
        </span>
      </div>

      {value.inviteLink ? (
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-[11px] font-mono px-2.5 py-1.5 rounded truncate tabular-nums"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-default)' }}
          >
            {value.inviteLink}
          </code>
          <button
            type="button"
            onClick={() => { void copy(); }}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {copied ? <Check className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium"
            style={{ color: 'var(--fg-muted)' }}
          >
            <RotateCcw className="w-3 h-3" />
            New
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="self-start inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-default)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <Link2 className="w-3 h-3" />
          Generate invite link
        </button>
      )}
    </div>
  );
}
