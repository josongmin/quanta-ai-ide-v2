import { useMemo, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { AuthShell } from '../AuthShell';
import { Button } from '../AuthForm';
import { generateCodes } from '../../lib/generateCodes';

// Backup code generation overlay

export function BackupCodesGenerated({ onClose }: { onClose: () => void }) {
  const codes = useMemo(() => generateCodes(10), []);
  const text = codes.join('\n');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1600);
    } catch { /* ignore */ }
  };

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
      title="Save your backup codes"
      subtitle="If you lose access to your authenticator, these are the only way back in. Each code works once."
      footer={
        <span style={{ color: 'var(--intent-warn-fg)' }}>
          We won&apos;t show these again. Save them now.
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
        <Button variant="secondary" onClick={() => { void copy(); }} leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button variant="secondary" onClick={download} leading={<Download className="w-3.5 h-3.5" />}>
          Download .txt
        </Button>
      </div>

      <Button onClick={onClose}>
        I&apos;ve saved them — continue
      </Button>
    </AuthShell>
  );
}
