import { useParams } from '@tanstack/react-router';
import { useRef } from 'react';
import { Bot, Plus, Key, RotateCcw, MoreHorizontal, Power } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { OrgShell } from '../parts/OrgShell';

type SA = {
  id: string;
  name: string;
  purpose: string;
  scopes: number;
  tokens: number;
  active: boolean;
  lastSeen: string;
  createdBy: string;
};

const SAS: SA[] = [
  { id: 'sa_ci',         name: 'ci-runner',        purpose: 'CI pipeline checks',     scopes: 4, tokens: 1, active: true,  lastSeen: '12 min ago',   createdBy: 's.kim'   },
  { id: 'sa_deploybot',  name: 'deploybot',         purpose: 'Deploy promotion',       scopes: 2, tokens: 1, active: true,  lastSeen: '2 hr ago',     createdBy: 'a.silva' },
  { id: 'sa_analytics',  name: 'analytics-worker',  purpose: 'Audit log → BigQuery',   scopes: 1, tokens: 2, active: true,  lastSeen: '24 min ago',   createdBy: 'p.chen'  },
  { id: 'sa_old',        name: 'legacy-ingest',     purpose: 'Old pipeline',           scopes: 6, tokens: 0, active: false, lastSeen: 'never',        createdBy: 'm.kim'   },
];

export default function ServiceAccountsPage() {
  const { org } = useParams({ strict: false }) as unknown as { org: string };
  return (
    <OrgShell
      orgName={org}
      orgSlug={org}
      title="Service accounts"
      subtitle="Machine identities for CI, scripts, and worker pools. Scope tightly; rotate tokens every 90 days."
      topRight={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          New service account
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Tile label="Total"  value={SAS.length}                 tone="default" />
        <Tile label="Active" value={SAS.filter((s) => s.active).length} tone="success" />
        <Tile label="Tokens" value={SAS.reduce((acc, s) => acc + s.tokens, 0)} tone="default" />
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="grid items-center px-4 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '2fr 1.6fr 0.7fr 0.7fr 1fr 0.7fr 0.4fr',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Name</span>
          <span>Purpose</span>
          <span className="text-right">Scopes</span>
          <span className="text-right">Tokens</span>
          <span>Last seen</span>
          <span>Status</span>
          <span></span>
        </div>
        {SAS.map((s, i) => (
          <Row key={s.id} sa={s} last={i === SAS.length - 1} />
        ))}
      </div>
    </OrgShell>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: 'default' | 'success' }) {
  const color = tone === 'success' ? 'var(--intent-success-fg)' : 'var(--fg-strong)';
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
    >
      <span className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: 'var(--fg-subtle)' }}>{label}</span>
      <span className="text-[22px] font-semibold tabular-nums tracking-tight" style={{ color }}>{value}</span>
    </div>
  );
}

function Row({ sa, last }: { sa: SA; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-4 h-14 transition-colors"
      style={{
        gridTemplateColumns: '2fr 1.6fr 0.7fr 0.7fr 1fr 0.7fr 0.4fr',
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
        opacity: sa.active ? 1 : 0.55,
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--fg-link) 14%, transparent)',
            color: 'var(--fg-link)',
          }}
        >
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col min-w-0">
          <code className="text-[12px] font-mono font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
            {sa.name}
          </code>
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>{sa.id} · by {sa.createdBy}</span>
        </div>
      </div>
      <span className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>{sa.purpose}</span>
      <span className="text-right text-[12px] tabular-nums" style={{ color: 'var(--fg-default)' }}>{sa.scopes}</span>
      <span className="text-right text-[12px] tabular-nums" style={{ color: 'var(--fg-default)' }}>{sa.tokens}</span>
      <span className="text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{sa.lastSeen}</span>
      <span
        className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-bold w-fit"
        style={{
          color: sa.active ? 'var(--intent-success-fg)' : 'var(--fg-subtle)',
          background: sa.active ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
        }}
      >
        {sa.active ? 'Active' : 'Disabled'}
      </span>
      <div className="flex justify-end gap-0.5">
        <IconBtn icon={Key} title="Tokens" />
        <IconBtn icon={RotateCcw} title="Rotate" />
        <IconBtn icon={Power} title={sa.active ? 'Disable' : 'Enable'} />
        <IconBtn icon={MoreHorizontal} title="More" />
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="w-7 h-7 rounded inline-flex items-center justify-center transition-colors"
      style={{ color: 'var(--fg-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
