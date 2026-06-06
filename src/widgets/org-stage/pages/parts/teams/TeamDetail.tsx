import { useState } from 'react';
import {
  Hash, GitBranch, Bell, X, Trash2, AtSign, Plus,
} from 'lucide-react';
import { Button } from '@shared/ui/forms';
import { ConfirmDialog } from '@shared/ui';
import type { Team } from './types';

export function TeamDetail({
  team, onChange, onRemove,
}: { team: Team; onChange: (t: Team) => void; onRemove: () => void }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [newPath, setNewPath] = useState('');

  const addPath = () => {
    if (!newPath.trim()) return;
    onChange({
      ...team,
      paths: [...team.paths, { id: `p-${Date.now()}`, pattern: newPath.trim(), auto: true }],
    });
    setNewPath('');
  };
  const removePath = (id: string) => {
    onChange({ ...team, paths: team.paths.filter((p) => p.id !== id) });
  };
  const togglePathAuto = (id: string) => {
    onChange({ ...team, paths: team.paths.map((p) => (p.id === id ? { ...p, auto: !p.auto } : p)) });
  };
  const setLead = (memberId: string) => {
    onChange({
      ...team,
      members: team.members.map((m) => ({ ...m, role: m.id === memberId ? 'lead' : 'member' })),
    });
  };
  const removeMember = (memberId: string) => {
    onChange({ ...team, members: team.members.filter((m) => m.id !== memberId) });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {team.name}
            </h2>
            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{team.handle}</span>
          </div>
          <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            {team.description || 'No description yet.'}
          </p>
        </div>
        <Button variant="ghost" leading={<Trash2 className="w-3 h-3" />} onClick={() => { setConfirmRemove(true); }}>
          Delete team
        </Button>
      </div>

      {/* Members */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Members · {team.members.length}
          </span>
          <Button leading={<AtSign className="w-3 h-3" />}>Add member</Button>
        </div>
        {team.members.length === 0 ? (
          <div className="text-[11px] py-4 text-center" style={{ color: 'var(--fg-subtle)' }}>
            No members yet. Add someone to start routing work here.
          </div>
        ) : (
          <ul className="flex flex-col">
            {team.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 py-2 [&:not(:first-child)]:border-t"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-default)' }}
                >
                  {m.avatar}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] font-medium truncate" style={{ color: 'var(--fg-strong)' }}>
                    {m.name}
                  </span>
                  <span className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>
                    {m.email}
                  </span>
                </div>
                {m.role === 'lead' ? (
                  <span
                    className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', color: 'var(--fg-accent)', border: '1px solid var(--fg-accent)' }}
                  >
                    Lead
                  </span>
                ) : (
                  <Button onClick={() => { setLead(m.id); }}>Make lead</Button>
                )}
                <button
                  type="button"
                  onClick={() => { removeMember(m.id); }}
                  className="w-7 h-7 rounded-md inline-flex items-center justify-center"
                  style={{ color: 'var(--fg-subtle)' }}
                  aria-label="Remove from team"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Code paths */}
      <div className="px-5 py-4 flex flex-col gap-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
            Code ownership · {team.paths.length}
          </span>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          Globs that route reviews and incidents to this team. Paths flagged Auto are added to <span className="font-mono">CODEOWNERS</span> on push.
        </p>
        <ul className="flex flex-col">
          {team.paths.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 py-2 [&:not(:first-child)]:border-t"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
              <span className="font-mono text-[11px] flex-1 truncate" style={{ color: 'var(--fg-default)' }}>
                {p.pattern}
              </span>
              <button
                type="button"
                onClick={() => { togglePathAuto(p.id); }}
                className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: p.auto ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
                  color: p.auto ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
                  border: `1px solid ${p.auto ? 'var(--intent-success-fg)' : 'var(--border-muted)'}`,
                }}
              >
                {p.auto ? 'Auto' : 'Manual'}
              </button>
              <button
                type="button"
                onClick={() => { removePath(p.id); }}
                className="w-7 h-7 rounded-md inline-flex items-center justify-center"
                style={{ color: 'var(--fg-subtle)' }}
                aria-label="Remove path"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <input
            value={newPath}
            onChange={(e) => { setNewPath(e.target.value); }}
            onKeyDown={(e) => { if (e.key === 'Enter') addPath(); }}
            placeholder="src/features/admission/**"
            className="flex-1 h-8 px-2.5 rounded-md text-[12px] font-mono outline-none"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
          />
          <Button leading={<Plus className="w-3 h-3" />} onClick={addPath}>Add path</Button>
        </div>
      </div>

      {/* Routing prefs */}
      <div className="px-5 py-4 flex flex-col gap-3">
        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
          Routing
        </span>
        <div className="flex items-center gap-3">
          <Bell className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
          <span className="text-[12px]" style={{ color: 'var(--fg-default)' }}>Notification channel</span>
          <div
            className="ml-auto flex items-center gap-1.5 h-8 px-2.5 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
          >
            <Hash className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={team.notifChannel.replace(/^#/, '')}
              onChange={(e) => { onChange({ ...team, notifChannel: `#${e.target.value}` }); }}
              className="bg-transparent outline-none text-[12px] font-mono w-[180px]"
              style={{ color: 'var(--fg-strong)' }}
            />
          </div>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          Created {team.createdAt}.
        </p>
      </div>

      {confirmRemove && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmRemove(false); }}
          onConfirm={() => { onRemove(); setConfirmRemove(false); }}
          title={`Delete ${team.name}?`}
          confirmLabel="Delete team"
          description="Members keep their org access. Code paths owned by this team revert to org default routing."
        />
      )}
    </div>
  );
}
