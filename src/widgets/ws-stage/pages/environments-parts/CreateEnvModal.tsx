import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Field } from '@shared/ui/forms';
import { ModalBackdrop, useDialogA11y } from '@shared/ui';
import type { Region } from './types';
import { REGION_LABELS } from './types';

export function CreateEnvModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, url: string, region: Region) => void }) {
  const { t } = useTranslation('ws');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [region, setRegion] = useState<Region>('us');
  const valid = name.trim().length > 0 && /^https:\/\/.+/.test(url);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onCancel);

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('environments.create.aria')}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] rounded-lg overflow-hidden outline-none"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
            <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>{t('environments.create.title')}</span>
          </div>
          <button type="button" onClick={onCancel} aria-label={t('environments.create.closeAria')} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <Field
            label={t('environments.create.nameLabel')}
            placeholder={t('environments.create.namePlaceholder')}
            value={name}
            onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          />
          <Field
            label={t('environments.create.urlLabel')}
            placeholder={t('environments.create.urlPlaceholder')}
            value={url}
            onChange={(e) => { setUrl(e.target.value); }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
              {t('environments.create.regionLabel')}
            </span>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value as Region); }}
              className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {(['us', 'eu', 'apac'] as Region[]).map((r) => (
                <option key={r} value={r}>{r} · {REGION_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel} leading={<Trash2 className="w-3 h-3" />}>{t('environments.create.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name, url, region); }}>
            {t('environments.create.create')}
          </Button>
        </div>
      </div>
    </>
  );
}
