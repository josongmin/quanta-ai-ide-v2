import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';

import { ALL_SCOPES, type SecretScope } from './types';

export function NewSecretModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, scopes: SecretScope[], exp: number | null) => void }) {
  const { t } = useTranslation('ws');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [reveal, setReveal] = useState(false);
  const [scopes, setScopes] = useState<Set<SecretScope>>(new Set(['agents']));
  const [exp, setExp] = useState<number | null>(90);

  const valid = /^[A-Z][A-Z0-9_]*$/.test(name) && value.length > 0 && scopes.size > 0;

  const toggle = (s: SecretScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  return (
    <SettingsModal
      open
      onClose={onCancel}
      title={t('secrets.modal.title')}
      size="lg"
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{t('secrets.modal.cancel')}</Button>
          <Button
            variant="primary"
            size="md"
            disabled={!valid}
            onClick={() => { onCreate(name, Array.from(scopes), exp); }}
          >
            {t('secrets.modal.generate')}
          </Button>
        </>
      )}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('secrets.modal.nameLabel')}
        </span>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')); }}
          placeholder={t('secrets.modal.namePlaceholder')}
          className="h-9 rounded-md px-3 text-base outline-none font-mono"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
          <span>{t('secrets.modal.valueLabel')}</span>
          <button
            type="button"
            onClick={() => { setReveal((v) => !v); }}
            className="lowercase tracking-normal inline-flex items-center gap-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            {reveal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {reveal ? t('secrets.modal.hide') : t('secrets.modal.show')}
          </button>
        </span>
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); }}
          placeholder={t('secrets.modal.valuePlaceholder')}
          rows={3}
          className="w-full rounded-md p-2.5 text-base outline-none resize-none font-mono"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
            WebkitTextSecurity: reveal ? 'none' : 'disc',
          } as React.CSSProperties}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('secrets.modal.scopesLabel')}
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_SCOPES.map((s) => {
            const on = scopes.has(s);
            return (
              <label
                key={s}
                className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                style={{
                  background: on ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
                  border: `1px solid ${on ? 'color-mix(in srgb, var(--fg-accent) 40%, transparent)' : 'var(--border-muted)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => { toggle(s); }}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-mono text-sm" style={{ color: 'var(--fg-default)' }}>{s}</span>
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
          {t('secrets.modal.expirationLabel')}
        </span>
        <select
          value={exp == null ? 'never' : String(exp)}
          onChange={(e) => { setExp(e.target.value === 'never' ? null : Number(e.target.value)); }}
          className="h-9 rounded-md px-3 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          <option value="never">{t('secrets.modal.never')}</option>
          <option value="30">{t('secrets.modal.days', { count: 30 })}</option>
          <option value="90">{t('secrets.modal.days', { count: 90 })}</option>
          <option value="365">{t('secrets.modal.days', { count: 365 })}</option>
        </select>
      </label>
    </SettingsModal>
  );
}
