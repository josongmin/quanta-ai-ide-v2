import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';
import { SCOPE_OPTIONS, type Scope } from './types';

export function CreatePatModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, scopes: Scope[], expiresInDays: number | null) => void }) {
  const { t } = useTranslation('org');
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Set<Scope>>(new Set(['org:read']));
  const [exp, setExp] = useState<number | null>(90);
  const valid = name.trim().length > 0 && scopes.size > 0;

  const toggle = (s: Scope) => {
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
      title={t('api.createPat.title')}
      size="lg"
      maxHeightVh={80}
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), Array.from(scopes), exp); }}>
            {t('api.createPat.generate')}
          </Button>
        </>
      )}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('api.createPat.tokenName')}</span>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder={t('api.createPat.tokenNamePlaceholder')}
          className="h-9 rounded-md px-3 text-base outline-none"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('api.createPat.expires')}</span>
        <select
          value={exp == null ? 'never' : String(exp)}
          onChange={(e) => { setExp(e.target.value === 'never' ? null : Number(e.target.value)); }}
          className="h-9 rounded-md px-3 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          <option value="30">{t('api.createPat.days30')}</option>
          <option value="60">{t('api.createPat.days60')}</option>
          <option value="90">{t('api.createPat.days90')}</option>
          <option value="365">{t('api.createPat.year1')}</option>
          <option value="never">{t('api.createPat.noExpiration')}</option>
        </select>
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
          <span>{t('api.createPat.scopes')}</span>
          <span className="lowercase tracking-normal tabular-nums">{t('api.createPat.selected', { count: scopes.size })}</span>
        </span>
        <div className="rounded-md overflow-hidden flex flex-col" style={{ border: '1px solid var(--border-muted)' }}>
          {SCOPE_OPTIONS.map((s) => {
            const on = scopes.has(s.id);
            return (
              <label
                key={s.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
                style={{
                  borderTop: '1px solid var(--border-muted)',
                  background: on ? 'var(--bg-active)' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => { toggle(s.id); }}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
                <span
                  className="font-mono text-sm flex-1"
                  style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-default)' }}
                >
                  {s.id}
                </span>
                <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{t(s.labelKey)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </SettingsModal>
  );
}
