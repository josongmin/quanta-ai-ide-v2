import { Send, Check } from 'lucide-react';
import { formatTime } from '@shared/i18n';
import type { InviteEntry } from '../../wizard';
import { ACCENT_TINT } from '../../primitives/shared';

// Send button + in-flight progress.
export function SendButton({
  count, progress, onSend,
}: { count: number; progress: number | null; onSend: () => void }) {
  if (progress != null) {
    const pct = (progress / count) * 100;
    return (
      <div
        className="flex flex-col gap-2 px-3 py-3 rounded-md onb-stagger"
        style={{
          background: ACCENT_TINT,
          border: '1px solid var(--fg-accent)',
        }}
      >
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            Sending invitations…
          </span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--fg-accent)' }}>
            {progress}/{count}
          </span>
        </div>
        <div className="relative h-[3px] rounded-full overflow-hidden"
          style={{ background: 'var(--border-muted)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${pct}%`,
              background: 'var(--fg-accent)',
              transition: 'width 240ms linear',
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSend}
      className="self-start inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold transition-opacity hover:opacity-90"
      style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
    >
      <Send className="w-3.5 h-3.5" />
      Send {count} invitation{count === 1 ? '' : 's'}
    </button>
  );
}

export function SentReceipt({ entries }: { entries: InviteEntry[] }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-success-bg)',
        border: '1px solid var(--intent-success-fg)',
      }}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {entries.length} invitation{entries.length === 1 ? '' : 's'} queued
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          · sent at {formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
        Recipients will get an email within a minute. They can also use the invite link if they prefer.
      </span>
    </div>
  );
}
