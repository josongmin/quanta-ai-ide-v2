import { useState } from 'react';
import {
  Plus, Pencil, ArrowUpRight, X, Check, AlertTriangle,
  Globe, ExternalLink, Trash2,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button, Toggle, Field } from '@shared/ui/forms';
import { ModalBackdrop } from '@shared/ui';

type Tier = 'production' | 'staging' | 'dev';
type Region = 'us' | 'eu' | 'apac';
type DeployStatus = 'success' | 'failure' | 'in_progress';

type Deploy = {
  id: string;
  sha: string;
  status: DeployStatus;
  by: string;
  at: string;
  durationMs: number;
};

type Environment = {
  id: string;
  name: string;
  tier: Tier;
  url: string;
  sha: string;
  deployedAt: string;
  region: Region;
  reviewers: number;
  blockDirectPush: boolean;
  promotesFrom: string;
  deploys: Deploy[];
};

const SEED_ENVS: Environment[] = [
  {
    id: 'dev',
    name: 'dev',
    tier: 'dev',
    url: 'https://dev.acme.app',
    sha: 'a31f4c2',
    deployedAt: '8m ago',
    region: 'us',
    reviewers: 0,
    blockDirectPush: false,
    promotesFrom: 'none',
    deploys: [
      { id: 'd1', sha: 'a31f4c2', status: 'success',     by: 'Sora Kim',   at: '8m ago',  durationMs: 142_000 },
      { id: 'd2', sha: '772aae9', status: 'success',     by: 'Mei Wang',   at: '34m ago', durationMs: 128_000 },
      { id: 'd3', sha: '14ce081', status: 'failure',     by: 'Diego Ramos',at: '1h ago',  durationMs:  61_000 },
      { id: 'd4', sha: 'b09baf3', status: 'success',     by: 'Sora Kim',   at: '2h ago',  durationMs: 134_000 },
      { id: 'd5', sha: 'cc41a17', status: 'success',     by: 'Mei Wang',   at: '4h ago',  durationMs: 121_000 },
    ],
  },
  {
    id: 'staging',
    name: 'staging',
    tier: 'staging',
    url: 'https://staging.acme.app',
    sha: '772aae9',
    deployedAt: '23m ago',
    region: 'us',
    reviewers: 1,
    blockDirectPush: true,
    promotesFrom: 'dev',
    deploys: [
      { id: 's1', sha: '772aae9', status: 'success',     by: 'auto-promote', at: '23m ago', durationMs: 188_000 },
      { id: 's2', sha: 'b09baf3', status: 'success',     by: 'auto-promote', at: '2h ago',  durationMs: 174_000 },
      { id: 's3', sha: 'cc41a17', status: 'success',     by: 'Sora Kim',     at: '5h ago',  durationMs: 191_000 },
      { id: 's4', sha: 'aa7e041', status: 'in_progress', by: 'auto-promote', at: 'just now', durationMs: 60_000 },
      { id: 's5', sha: '60b27ab', status: 'failure',     by: 'Mei Wang',     at: '1d ago',  durationMs: 102_000 },
    ],
  },
  {
    id: 'canary',
    name: 'canary',
    tier: 'staging',
    url: 'https://canary.acme.app',
    sha: 'b09baf3',
    deployedAt: '2h ago',
    region: 'eu',
    reviewers: 1,
    blockDirectPush: true,
    promotesFrom: 'staging',
    deploys: [
      { id: 'c1', sha: 'b09baf3', status: 'success', by: 'auto-promote', at: '2h ago',  durationMs: 215_000 },
      { id: 'c2', sha: 'cc41a17', status: 'success', by: 'auto-promote', at: '5h ago',  durationMs: 209_000 },
      { id: 'c3', sha: '60b27ab', status: 'failure', by: 'auto-promote', at: '1d ago',  durationMs:  88_000 },
      { id: 'c4', sha: '4f2c1de', status: 'success', by: 'Diego Ramos',  at: '2d ago',  durationMs: 220_000 },
      { id: 'c5', sha: '981ab02', status: 'success', by: 'auto-promote', at: '3d ago',  durationMs: 198_000 },
    ],
  },
  {
    id: 'prod',
    name: 'prod',
    tier: 'production',
    url: 'https://acme.app',
    sha: 'cc41a17',
    deployedAt: '5h ago',
    region: 'us',
    reviewers: 2,
    blockDirectPush: true,
    promotesFrom: 'canary',
    deploys: [
      { id: 'p1', sha: 'cc41a17', status: 'success', by: 'Sora Kim',    at: '5h ago', durationMs: 311_000 },
      { id: 'p2', sha: '4f2c1de', status: 'success', by: 'Mei Wang',    at: '2d ago', durationMs: 298_000 },
      { id: 'p3', sha: '981ab02', status: 'success', by: 'Diego Ramos', at: '3d ago', durationMs: 305_000 },
      { id: 'p4', sha: '11abf30', status: 'failure', by: 'Sora Kim',    at: '4d ago', durationMs:  76_000 },
      { id: 'p5', sha: 'aa00bcd', status: 'success', by: 'Mei Wang',    at: '5d ago', durationMs: 294_000 },
    ],
  },
];

const REGION_LABELS: Record<Region, string> = {
  us:   'us-east-1',
  eu:   'eu-west-1',
  apac: 'apac-southeast-1',
};

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

function EnvCard({
  env, onEdit, onPromote,
}: { env: Environment; onEdit: () => void; onPromote: () => void }) {
  return (
    <div
      role="presentation"
      className="p-4 rounded-md flex flex-col gap-3 transition-colors"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = 'var(--border-default)'; }}
      onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = 'var(--border-muted)'; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
              {env.name}
            </span>
            <TierBadge tier={env.tier} />
            <RegionChip region={env.region} />
          </div>
          <a
            href={env.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-mono truncate"
            style={{ color: 'var(--fg-link)' }}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate">{env.url}</span>
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
          </a>
        </div>
      </div>

      <div
        className="rounded-md px-3 py-2.5 flex items-center justify-between gap-3"
        style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Current deploy
          </span>
          <span className="font-mono text-[12px] truncate" style={{ color: 'var(--fg-strong)' }}>
            {env.sha}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
            Deployed
          </span>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-default)' }}>
            {env.deployedAt}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <Button leading={<Pencil className="w-3 h-3" />} onClick={onEdit}>Edit</Button>
        <Button
          variant="primary"
          leading={<ArrowUpRight className="w-3 h-3" />}
          onClick={onPromote}
        >
          Promote
        </Button>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const cfg =
    tier === 'production'
      ? { label: 'production', bg: 'var(--intent-warn-bg)', fg: 'var(--intent-warn-fg)' }
      : tier === 'staging'
      ? { label: 'staging',    bg: 'var(--bg-surface-muted)', fg: 'var(--fg-muted)' }
      : { label: 'dev',        bg: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', fg: 'var(--fg-accent)' };
  return (
    <span
      className="text-[9px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}

function RegionChip({ region }: { region: Region }) {
  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
      title={REGION_LABELS[region]}
    >
      {region}
    </span>
  );
}

function EnvDrawer({
  env, allEnvs, onClose, onChange,
}: {
  env: Environment;
  allEnvs: Environment[];
  onClose: () => void;
  onChange: (patch: Partial<Environment>) => void;
}) {
  const promoteOptions: { id: string; label: string }[] = [
    { id: 'none', label: '(no auto-promote)' },
    ...allEnvs.filter((e) => e.id !== env.id).map((e) => ({ id: e.name, label: e.name })),
  ];

  return (
    <>
      <ModalBackdrop onClick={onClose} z="z-40" alpha={0.45} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-[460px] flex flex-col"
        style={{ background: 'var(--bg-elevated)', borderLeft: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
              {env.name}
            </span>
            <TierBadge tier={env.tier} />
            <RegionChip region={env.region} />
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          <Field
            label="Name"
            value={env.name}
            onChange={(e) => { onChange({ name: e.target.value }); }}
          />

          <Field
            label="URL"
            value={env.url}
            onChange={(e) => { onChange({ url: e.target.value }); }}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Region
            </span>
            <select
              value={env.region}
              onChange={(e) => { onChange({ region: e.target.value as Region }); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {(['us', 'eu', 'apac'] as Region[]).map((r) => (
                <option key={r} value={r}>{r} · {REGION_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <Field
            label="Required reviewers to deploy"
            type="number"
            min={0}
            max={5}
            value={env.reviewers}
            onChange={(e) => { onChange({ reviewers: Math.max(0, Math.min(5, Number(e.target.value) || 0)) }); }}
          />

          <div
            className="flex items-start justify-between gap-4 px-3 py-3 rounded-md"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
                Block direct push
              </span>
              <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
                Only the promotion gate can deploy here. Direct pushes are rejected.
              </span>
            </div>
            <Toggle
              checked={env.blockDirectPush}
              onChange={(v) => { onChange({ blockDirectPush: v }); }}
              label="Block direct push"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Promotes from
            </span>
            <select
              value={env.promotesFrom}
              onChange={(e) => { onChange({ promotesFrom: e.target.value }); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {promoteOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>
              Recent deploys
            </span>
            <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
              {env.deploys.length === 0 ? (
                <li className="px-3 py-3 text-[11px] text-center" style={{ color: 'var(--fg-subtle)' }}>
                  No deploys yet.
                </li>
              ) : env.deploys.slice(0, 5).map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <DeployStatusIcon status={d.status} />
                  <span className="font-mono text-[11px] shrink-0" style={{ color: 'var(--fg-strong)' }}>
                    {d.sha}
                  </span>
                  <span className="text-[11px] truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                    {d.by}
                  </span>
                  <span className="text-[10px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                    {d.at}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        </div>
      </aside>
    </>
  );
}

function DeployStatusIcon({ status }: { status: DeployStatus }) {
  if (status === 'success') {
    return <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />;
  }
  if (status === 'failure') {
    return <X className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />;
  }
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0 ml-[3px] mr-[3px]"
      style={{ background: 'var(--fg-accent)', boxShadow: '0 0 6px var(--fg-accent)' }}
      title="in progress"
    />
  );
}

function CreateEnvModal({
  onCancel, onCreate,
}: { onCancel: () => void; onCreate: (name: string, url: string, region: Region) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [region, setRegion] = useState<Region>('us');
  const valid = name.trim().length > 0 && /^https:\/\/.+/.test(url);

  return (
    <>
      <ModalBackdrop onClick={onCancel} z="z-40" alpha={0.45} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-muted)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>New environment</span>
          </div>
          <button type="button" onClick={onCancel} className="w-7 h-7 inline-flex items-center justify-center" style={{ color: 'var(--fg-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <Field
            label="Name"
            placeholder="e.g. preview"
            value={name}
            onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          />
          <Field
            label="URL"
            placeholder="https://preview.acme.app"
            value={url}
            onChange={(e) => { setUrl(e.target.value); }}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
              Region
            </span>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value as Region); }}
              className="h-9 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-strong)',
              }}
            >
              {(['us', 'eu', 'apac'] as Region[]).map((r) => (
                <option key={r} value={r}>{r} · {REGION_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}>
          <Button variant="ghost" onClick={onCancel} leading={<Trash2 className="w-3 h-3" />}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid} onClick={() => { onCreate(name, url, region); }}>
            Create environment
          </Button>
        </div>
      </div>
    </>
  );
}
