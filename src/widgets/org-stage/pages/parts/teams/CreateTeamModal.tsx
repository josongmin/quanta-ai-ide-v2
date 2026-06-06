import { useState } from 'react';
import { Button } from '@shared/ui/forms';
import { SettingsModal } from '@shared/ui';

export function CreateTeamModal({
  existingHandles, onCancel, onCreate,
}: { existingHandles: string[]; onCancel: () => void; onCreate: (name: string, handle: string) => void }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const conflict = handle && existingHandles.includes(`@${handle}`);
  const valid = name.trim().length > 0 && handle.trim().length > 0 && !conflict;

  return (
    <SettingsModal
      open
      onClose={onCancel}
      title="New team"
      size="sm"
      bodyClassName="p-4 flex flex-col gap-3"
      footer={(
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), `@${handle}`); }}>
            Create team
          </Button>
        </>
      )}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>Name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!handle) setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }}
          placeholder="Mobile"
          className="h-9 rounded-md px-3 text-[12px] outline-none"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium flex items-center justify-between" style={{ color: 'var(--fg-subtle)' }}>
          <span>Handle</span>
          {conflict && (
            <span className="lowercase tracking-normal" style={{ color: 'var(--intent-danger-fg)' }}>
              already taken
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
          <span className="pl-3 text-[12px] font-mono" style={{ color: 'var(--fg-subtle)' }}>@</span>
          <input
            value={handle}
            onChange={(e) => { setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '')); }}
            placeholder="mobile"
            className="flex-1 bg-transparent outline-none px-2 text-[12px] font-mono"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
      </label>
    </SettingsModal>
  );
}
