import { useTranslation } from 'react-i18next';
import { Send, Check } from 'lucide-react';
import { formatTime } from '@shared/i18n';
import type { InviteEntry } from '../../wizard';
import { ACCENT_TINT } from '../../primitives/shared';

// Send button + in-flight progress.
export function SendButton({
  count, progress, onSend,
}: { count: number; progress: number | null; onSend: () => void }) {
  const { t } = useTranslation('onboarding');
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
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('invite.sending')}
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
      className="self-start inline-flex items-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold transition-opacity hover:opacity-90"
      style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
    >
      <Send className="w-3.5 h-3.5" />
      {t('invite.sendInvitations', { count })}
    </button>
  );
}

export function SentReceipt({ entries }: { entries: InviteEntry[] }) {
  const { t } = useTranslation('onboarding');
  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-success-bg)',
        border: '1px solid var(--intent-success-fg)',
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t('invite.queued', { count: entries.length })}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {t('invite.sentAt', { time: formatTime(new Date(), { hour: '2-digit', minute: '2-digit' }) })}
        </span>
      </div>
      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        {t('invite.receiptBody')}
      </span>
    </div>
  );
}
