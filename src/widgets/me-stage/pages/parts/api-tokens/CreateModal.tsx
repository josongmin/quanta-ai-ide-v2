import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Field, Button, Checkbox } from '@shared/ui/forms';
import { MeModal } from '../../../parts/MeModal';
import { SCOPE_GROUPS, ALL_SCOPES, type ScopeId, type Token } from './types';

export function CreateModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (t: Token) => void }) {
  const { t } = useTranslation('me');
  const [name, setName] = useState('');
  const [expiresIn, setExpiresIn] = useState<'30' | '60' | '90' | '365' | 'never'>('90');
  const [scopes, setScopes] = useState<Set<ScopeId>>(new Set(['read:repo']));

  const valid = name.trim().length > 0 && scopes.size > 0;
  const dangerScopes = ALL_SCOPES.filter((s) => scopes.has(s.id) && s.danger);

  const create = () => {
    if (!valid) return;
    const expiresAt = expiresIn === 'never' ? null
      : new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prefix = `sef_${Math.random().toString(36).slice(2, 6)}`;
    const token: Token = {
      id: `t_${Date.now()}`,
      name: name.trim(),
      scopes: Array.from(scopes),
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt,
      lastUsedAt: 'Never',
      prefix,
    };
    onCreate(token);
  };

  const toggleScope = (id: ScopeId) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <MeModal onClose={onClose} widthClass="max-w-[520px]" scroll ariaLabelledby="create-token-heading">
      <h3 id="create-token-heading" className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {t('apiTokens.create.title')}
        </h3>

        <Field
          label={t('apiTokens.create.name')}
          value={name}
          onChange={(e) => { setName(e.target.value); }}
          placeholder={t('apiTokens.create.namePlaceholder')}
          autoFocus
          hint={t('apiTokens.create.nameHint')}
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-xs uppercase tracking-eyebrow font-medium pb-1" style={{ color: 'var(--fg-subtle)' }}>
            {t('apiTokens.create.expiration')}
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(['30', '60', '90', '365', 'never'] as const).map((d) => {
              const active = expiresIn === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setExpiresIn(d); }}
                  className="h-7 px-2.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: active ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                    color: active ? 'var(--fg-strong)' : 'var(--fg-default)',
                    border: `1px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
                  }}
                >
                  {d === 'never' ? t('apiTokens.create.never') : t('apiTokens.create.days', { count: Number(d) })}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
            {t('apiTokens.create.scopes')}
          </legend>
          <div className="flex flex-col gap-3">
            {SCOPE_GROUPS.map((g) => (
              <div key={g.title} className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-eyebrow" style={{ color: 'var(--fg-muted)' }}>
                  {g.title}
                </span>
                {g.scopes.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-md transition-colors"
                    style={{
                      background: scopes.has(s.id) ? 'var(--bg-active)' : 'transparent',
                    }}
                  >
                    <Checkbox
                      checked={scopes.has(s.id)}
                      onChange={() => { toggleScope(s.id); }}
                      label={s.id}
                    />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code
                          className="text-sm font-mono"
                          style={{ color: s.danger ? 'var(--intent-warn-fg)' : 'var(--fg-strong)' }}
                        >
                          {s.label}
                        </code>
                        {s.danger && (
                          <span
                            className="text-2xs uppercase tracking-eyebrow font-semibold px-1 py-0.5 rounded"
                            style={{
                              background: 'var(--intent-warn-bg)',
                              color: 'var(--intent-warn-fg)',
                            }}
                          >
                            {t('apiTokens.create.destructive')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                        {s.sub}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        {dangerScopes.length > 0 && (
          <div
            className="flex items-start gap-2 px-2.5 py-2 rounded text-sm onb-stagger"
            style={{
              background: 'var(--intent-warn-bg)',
              border: '1px solid var(--intent-warn-fg)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
            <span style={{ color: 'var(--fg-strong)' }}>
              {t('apiTokens.create.dangerWarning', { count: dangerScopes.length })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" onClick={create} disabled={!valid}>
            {t('apiTokens.create.generate')}
          </Button>
        </div>
    </MeModal>
  );
}
