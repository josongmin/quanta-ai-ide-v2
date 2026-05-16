import { useMemo, useState } from 'react';
import {
  UsersRound, Search, Plus, Hash, GitBranch, Bell,
  X, Trash2, AtSign, AlertTriangle,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';

type Member = { id: string; name: string; email: string; avatar: string; role: 'lead' | 'member' };
type CodePath = { id: string; pattern: string; auto: boolean };
type Team = {
  id: string;
  name: string;
  handle: string;
  description: string;
  members: Member[];
  paths: CodePath[];
  notifChannel: string;
  createdAt: string;
};

const SEED: Team[] = [
  {
    id: 't1',
    name: 'Platform',
    handle: '@platform',
    description: 'Owns CI, build, deploy, and the dev-experience tooling.',
    notifChannel: '#eng-platform',
    createdAt: '2025-04-12',
    members: [
      { id: 'u1', name: 'Sora Kim',   email: 'sora@acme.com',   avatar: 'SK', role: 'lead'   },
      { id: 'u2', name: 'Lee Junho',  email: 'junho@acme.com',  avatar: 'LJ', role: 'member' },
    ],
    paths: [
      { id: 'p1', pattern: 'infra/**',           auto: true  },
      { id: 'p2', pattern: '.github/workflows/*', auto: true  },
      { id: 'p3', pattern: 'tools/**',            auto: false },
    ],
  },
  {
    id: 't2',
    name: 'Frontend',
    handle: '@frontend',
    description: 'Web app, design system, and user-facing features.',
    notifChannel: '#eng-frontend',
    createdAt: '2025-04-12',
    members: [
      { id: 'u4', name: 'Brad Lee',  email: 'brad@acme.com', avatar: 'BL', role: 'lead'   },
      { id: 'u5', name: 'Hana Park', email: 'hana@acme.com', avatar: 'HP', role: 'member' },
    ],
    paths: [
      { id: 'p4', pattern: 'src/widgets/**', auto: true },
      { id: 'p5', pattern: 'src/features/**', auto: true },
    ],
  },
  {
    id: 't3',
    name: 'Backend',
    handle: '@backend',
    description: 'APIs, data plane, agent orchestration.',
    notifChannel: '#eng-backend',
    createdAt: '2025-04-15',
    members: [
      { id: 'u6', name: 'Diego Ramos', email: 'diego@acme.com', avatar: 'DR', role: 'lead'   },
      { id: 'u7', name: 'Aoi Tanaka',  email: 'aoi@acme.com',   avatar: 'AT', role: 'member' },
    ],
    paths: [
      { id: 'p6', pattern: 'services/**', auto: true },
      { id: 'p7', pattern: 'packages/api/**', auto: true },
    ],
  },
  {
    id: 't4',
    name: 'Security',
    handle: '@security',
    description: 'Threat model, secret hygiene, admission rules.',
    notifChannel: '#sec-incidents',
    createdAt: '2025-05-01',
    members: [
      { id: 'u3', name: 'Mei Wang', email: 'mei@acme.com', avatar: 'MW', role: 'lead' },
    ],
    paths: [
      { id: 'p8', pattern: '.semgrep/**',      auto: true },
      { id: 'p9', pattern: 'docs/security/**', auto: true },
    ],
  },
  {
    id: 't5',
    name: 'Data',
    handle: '@data',
    description: 'Analytics pipelines and warehouse models.',
    notifChannel: '#data-alerts',
    createdAt: '2025-05-08',
    members: [
      { id: 'u8', name: 'Kofi Mensah', email: 'kofi@acme.com', avatar: 'KM', role: 'lead' },
    ],
    paths: [
      { id: 'p10', pattern: 'dbt/**', auto: true },
    ],
  },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(SEED);
  const [selectedId, setSelectedId] = useState<string>('t1');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return teams;
    const n = q.toLowerCase();
    return teams.filter((t) =>
      t.name.toLowerCase().includes(n)
      || t.handle.toLowerCase().includes(n)
      || t.description.toLowerCase().includes(n));
  }, [teams, q]);

  const selected = teams.find((t) => t.id === selectedId) ?? null;

  const updateTeam = (next: Team) => {
    setTeams((all) => all.map((t) => (t.id === next.id ? next : t)));
  };
  const removeTeam = (id: string) => {
    setTeams((all) => all.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(teams[0]?.id ?? '');
  };
  const addTeam = (name: string, handle: string) => {
    const id = `t-${Date.now()}`;
    setTeams((all) => [...all, {
      id, name, handle, description: '', members: [], paths: [], notifChannel: '', createdAt: '2026-05-11',
    }]);
    setSelectedId(id);
  };

  return (
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="Teams"
      subtitle="Group people for ownership routing, notifications, and review assignment."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
          New team
        </Button>
      }
    >
      <div
        className="grid rounded-md overflow-hidden"
        style={{
          gridTemplateColumns: '300px 1fr',
          border: '1px solid var(--border-muted)',
          minHeight: 560,
        }}
      >
        {/* Left list */}
        <div className="flex flex-col" style={{ borderRight: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2 h-9 px-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
            <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); }}
              placeholder="Search teams…"
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: 'var(--fg-strong)' }}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                No teams match.
              </div>
            ) : filtered.map((t) => {
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedId(t.id); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors [&:not(:first-child)]:border-t"
                  style={{
                    background: active ? 'var(--bg-active)' : 'transparent',
                    borderColor: 'var(--border-muted)',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <UsersRound className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                        {t.name}
                      </span>
                      <span className="text-[10px] font-mono truncate" style={{ color: 'var(--fg-subtle)' }}>
                        {t.handle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                      <span>{t.members.length} {t.members.length === 1 ? 'member' : 'members'}</span>
                      <span>·</span>
                      <span>{t.paths.length} paths</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right detail */}
        <div className="flex flex-col">
          {selected ? (
            <TeamDetail
              team={selected}
              onChange={updateTeam}
              onRemove={() => { removeTeam(selected.id); }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <UsersRound className="w-7 h-7" style={{ color: 'var(--fg-subtle)' }} />
              <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                No team selected
              </span>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateTeamModal
          existingHandles={teams.map((t) => t.handle)}
          onCancel={() => { setCreateOpen(false); }}
          onCreate={(name, handle) => { addTeam(name, handle); setCreateOpen(false); }}
        />
      )}
    </OrgShell>
  );
}

function TeamDetail({
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
                    style={{ background: 'var(--brand-bg)', color: 'var(--brand-fg)', border: '1px solid var(--brand-fg)' }}
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
        <ConfirmRemoveTeam
          name={team.name}
          onCancel={() => { setConfirmRemove(false); }}
          onConfirm={() => { onRemove(); setConfirmRemove(false); }}
        />
      )}
    </div>
  );
}

function CreateTeamModal({
  existingHandles, onCancel, onCreate,
}: { existingHandles: string[]; onCancel: () => void; onCreate: (name: string, handle: string) => void }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const conflict = handle && existingHandles.includes(`@${handle}`);
  const valid = name.trim().length > 0 && handle.trim().length > 0 && !conflict;

  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
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

function ConfirmRemoveTeam({
  name, onCancel, onConfirm,
}: { name: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>Delete {name}?</span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            Members keep their org access. Code paths owned by this team revert to org default routing.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Delete team</Button>
        </div>
      </div>
    </>
  );
}
