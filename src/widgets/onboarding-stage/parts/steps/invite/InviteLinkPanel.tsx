import { useTranslation } from 'react-i18next';
import { Link2, Check, Copy, RotateCcw } from 'lucide-react';
import { useCopyToClipboard } from '@shared/lib';
import type { WizardData } from '../../wizard';

// Magic invite link — generate, copy, regenerate.
export function InviteLinkPanel({
  value, onGenerate,
}: { value: WizardData['invite']; onGenerate: () => void }) {
  const { t } = useTranslation('onboarding');
  const { copied, copy } = useCopyToClipboard(1500);

  const handleCopy = () => {
    if (!value.inviteLink) return;
    copy(value.inviteLink);
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
        <span className="text-sm font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t('invite.shareLink')}
        </span>
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          {t('invite.linkMeta')}
        </span>
      </div>

      {value.inviteLink ? (
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-sm font-mono px-2.5 py-1.5 rounded truncate tabular-nums"
            style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)', color: 'var(--fg-default)' }}
          >
            {value.inviteLink}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-sm font-medium"
            style={{
              background: 'var(--bg-canvas)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-default)',
            }}
          >
            {copied ? <Check className="w-3 h-3" style={{ color: 'var(--intent-success-fg)' }} /> : <Copy className="w-3 h-3" />}
            {copied ? t('invite.copied') : t('invite.copy')}
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-sm font-medium"
            style={{ color: 'var(--fg-muted)' }}
          >
            <RotateCcw className="w-3 h-3" />
            {t('invite.new')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          className="self-start inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-sm font-medium"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-default)',
            border: '1px dashed var(--border-default)',
          }}
        >
          <Link2 className="w-3 h-3" />
          {t('invite.generateLink')}
        </button>
      )}
    </div>
  );
}
