import { useMemo, useState } from 'react';
import {
  UsersRound, Search, Plus,
} from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import { TeamDetail } from './parts/teams/TeamDetail';
import { CreateTeamModal } from './parts/teams/CreateTeamModal';
import type { Team } from './parts/teams/types';

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
              className="flex-1 bg-transparent outline-none text-base"
              style={{ color: 'var(--fg-strong)' }}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--fg-subtle)' }}>
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
                      <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
                        {t.name}
                      </span>
                      <span className="text-xs font-mono truncate" style={{ color: 'var(--fg-subtle)' }}>
                        {t.handle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--fg-muted)' }}>
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
              <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
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
