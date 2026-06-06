import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';

// NOTE: kept hand-rolled (not SettingsModal): the modal body uses `flex
// flex-col gap-3`, but SettingsModal hardcodes a `gap-4` body. Migrating would
// change the vertical spacing between the Name and Handle fields. See kit gap
// note in the migration report.
export function CreateTeamModal({
  existingHandles, onCancel, onCreate,
}: { existingHandles: string[]; onCancel: () => void; onCreate: (name: string, handle: string) => void }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const conflict = handle && existingHandles.includes(`@${handle}`);
  const valid = name.trim().length > 0 && handle.trim().length > 0 && !conflict;

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} label="Close dialog" />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New team</span>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-3">
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
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name.trim(), `@${handle}`); }}>
            Create team
          </Button>
        </div>
      </div>
    </>
  );
}
