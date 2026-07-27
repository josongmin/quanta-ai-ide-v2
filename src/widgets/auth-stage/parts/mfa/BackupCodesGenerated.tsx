import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Copy, Check } from 'lucide-react';
import { AuthShell } from '../AuthShell';
import { AuthButton as Button } from '@shared/ui/forms';
import { generateCodes } from '../../lib/generateCodes';
import { useCopyToClipboard } from '@shared/lib';

// Backup code generation overlay

export function BackupCodesGenerated({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('auth');
  const codes = useMemo(() => generateCodes(10), []);
  const text = codes.join('\n');
  const { copied, copy } = useCopyToClipboard(1600);

  const download = () => {
    const blob = new Blob([`# se · field backup codes\n# Generated ${new Date().toISOString()}\n# Each code can be used once.\n\n${text}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sefield-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthShell
      title={t('mfa.backupCodes.title')}
      subtitle={t('mfa.backupCodes.subtitle')}
      footer={
        <span style={{ color: 'var(--intent-warn-fg)' }}>
          {t('mfa.backupCodes.footer')}
        </span>
      }
    >
      <div
        className="p-4 rounded-md font-mono text-base tabular-nums grid grid-cols-2 gap-x-6 gap-y-1.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {codes.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="text-2xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{c}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => { copy(text); }} leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
          {copied ? t('mfa.backupCodes.copied') : t('mfa.backupCodes.copyAll')}
        </Button>
        <Button variant="secondary" onClick={download} leading={<Download className="w-3.5 h-3.5" />}>
          {t('mfa.backupCodes.downloadTxt')}
        </Button>
      </div>

      <Button onClick={onClose}>
        {t('mfa.backupCodes.saved')}
      </Button>
    </AuthShell>
  );
}
