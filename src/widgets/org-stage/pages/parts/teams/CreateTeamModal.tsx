import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';

export function CreateTeamModal({
  existingHandles, onCancel, onCreate,
}: { existingHandles: string[]; onCancel: () => void; onCreate: (name: string, handle: string) => void }) {
  const { t } = useTranslation('org');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const conflict = handle && existingHandles.includes(`@${handle}`);
  const valid = name.trim().length > 0 && handle.trim().length > 0 && !conflict;

  return (
    <SettingsModal
      open
      onClose={onCancel}
      title={t('teams.create.title')}
      size="sm"
      bodyClassName="p-4 flex flex-col gap-3"
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), `@${handle}`); }}>
            {t('teams.create.createTeam')}
          </Button>
        </>
      )}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('teams.create.name')}</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!handle) setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }}
          placeholder={t('teams.create.namePlaceholder')}
          className="h-9 rounded-md px-3 text-base outline-none"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
          <span>{t('teams.create.handle')}</span>
          {conflict && (
            <span className="lowercase tracking-normal" style={{ color: 'var(--intent-danger-fg)' }}>
              {t('teams.create.handleTaken')}
            </span>
          )}
        </span>
        <div
          className="flex items-center h-9 rounded-md"
          style={{
            background: 'var(--bg-surface-muted)',
            border: `1px solid ${conflict ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
          }}
        >
          <span className="pl-3 text-base font-mono" style={{ color: 'var(--fg-subtle)' }}>@</span>
          <input
            value={handle}
            onChange={(e) => { setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); }}
            placeholder={t('teams.create.handlePlaceholder')}
            className="flex-1 bg-transparent outline-none px-2 text-base font-mono"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
      </label>
    </SettingsModal>
  );
}
