import { useState } from 'react';
import { Plus } from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button } from '@shared/ui/forms';
import { EnvCard, EnvDrawer, CreateEnvModal, SEED_ENVS } from './environments-parts';
import type { Environment, Region } from './environments-parts';

export default function EnvironmentsPage() {
  const [envs, setEnvs] = useState<Environment[]>(SEED_ENVS);
  const [drawer, setDrawer] = useState<Environment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const updateEnv = (id: string, patch: Partial<Environment>) => {
    setEnvs((all) => all.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setDrawer((d) => (d?.id === id ? { ...d, ...patch } : d));
  };

  const addEnv = (name: string, url: string, region: Region) => {
    const id = `env-${Date.now()}`;
    setEnvs((all) => [...all, {
      id, name, tier: 'dev', url, sha: '0000000',
      deployedAt: 'never', region, reviewers: 0, blockDirectPush: false,
      promotesFrom: 'none', deploys: [],
    }]);
  };

  const promote = (id: string) => {
    // Demo only: bump deployedAt to "promoting…" briefly.
    updateEnv(id, { deployedAt: 'promoting…' });
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Environments"
      subtitle="Targets this workspace deploys to. Each environment owns its own URL, region, and promotion gate."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
          New environment
        </Button>
      }
    >
      <h2 className="text-[10px] uppercase tracking-[0.14em] font-semibold mb-2" style={{ color: 'var(--fg-subtle)' }}>
        Environments · {envs.length}
      </h2>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {envs.map((e) => (
          <EnvCard
            key={e.id}
            env={e}
            onEdit={() => { setDrawer(e); }}
            onPromote={() => { promote(e.id); }}
          />
        ))}
      </div>

      {drawer && (
        <EnvDrawer
          env={drawer}
          allEnvs={envs}
          onClose={() => { setDrawer(null); }}
          onChange={(patch) => { updateEnv(drawer.id, patch); }}
        />
      )}

      {createOpen && (
        <CreateEnvModal
          onCancel={() => { setCreateOpen(false); }}
          onCreate={(name, url, region) => { addEnv(name, url, region); setCreateOpen(false); }}
        />
      )}
    </WsShell>
  );
}
