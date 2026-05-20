import { useRef, useState } from 'react';
import { Plus, MoreHorizontal, Copy, RotateCcw, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { DeveloperShell } from '../parts/DeveloperShell';

type App = {
  id: string;
  name: string;
  vendor: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string;
  installs: number;
  status: 'live' | 'dev';
};

const APPS: App[] = [
  { id: 'oa_1', name: 'CI bot',         vendor: 'internal',  scopes: ['workspaces:read', 'admission:write'], createdAt: '2025-11-04', lastUsed: '2 min ago',  installs: 1,  status: 'live' },
  { id: 'oa_2', name: 'Linear bridge',  vendor: 'Linear',    scopes: ['agents:read', 'admission:read'],      createdAt: '2025-09-12', lastUsed: '12 min ago', installs: 28, status: 'live' },
  { id: 'oa_3', name: 'Slack notifier', vendor: 'Slack',     scopes: ['webhooks:read', 'audit:read'],        createdAt: '2025-08-22', lastUsed: '3 hr ago',  installs: 142, status: 'live' },
  { id: 'oa_4', name: 'Internal dev',   vendor: 'internal',  scopes: ['*'],                                  createdAt: '2026-04-01', lastUsed: 'never',     installs: 0,  status: 'dev' },
];

export default function OAuthAppsPage() {
  return (
    <DeveloperShell
      title="OAuth apps"
      subtitle="Register clients that act on behalf of your org. Rotate secrets regularly; usage shows up in the audit log."
      topRight={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold transition-colors"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          New OAuth app
        </button>
      }
    >
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div
          className="grid items-center px-4 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '1.4fr 1.2fr 1.4fr 0.8fr 0.8fr 0.4fr',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>App</span>
          <span>Vendor</span>
          <span>Scopes</span>
          <span className="text-right">Installs</span>
          <span className="text-right">Last used</span>
          <span></span>
        </div>
        {APPS.map((a, i) => (
          <AppRow key={a.id} app={a} last={i === APPS.length - 1} />
        ))}
      </div>

      <ClientSecretsCard />
    </DeveloperShell>
  );
}

function AppRow({ app, last }: { app: App; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-4 h-14 transition-colors"
      style={{
        gridTemplateColumns: '1.4fr 1.2fr 1.4fr 0.8fr 0.8fr 0.4fr',
        borderBottom: last ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
          style={{
            background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
            color: 'var(--fg-accent)',
          }}
        >
          {app.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>
            {app.name}
          </span>
          <code className="text-[10px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{app.id}</code>
        </div>
      </div>
      <span className="text-[12px]" style={{ color: 'var(--fg-default)' }}>{app.vendor}</span>
      <div className="flex items-center gap-1 flex-wrap">
        {app.scopes.slice(0, 3).map((s) => (
          <code
            key={s}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            {s}
          </code>
        ))}
        {app.scopes.length > 3 && (
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>+{app.scopes.length - 3}</span>
        )}
      </div>
      <span className="text-right text-[12px] tabular-nums" style={{ color: 'var(--fg-default)' }}>{app.installs}</span>
      <span className="text-right text-[11px] tabular-nums" style={{ color: 'var(--fg-muted)' }}>{app.lastUsed}</span>
      <div className="flex justify-end">
        <button
          type="button"
          className="w-7 h-7 rounded inline-flex items-center justify-center transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ClientSecretsCard() {
  const [shown, setShown] = useState(false);
  const secret = 'ses_••••••••••••••••••••••••••';
  const real   = 'ses_T8Hc2RvL6Wq3pPMa9zJYxK0dQ';
  return (
    <div
      className="mt-8 rounded-xl p-5"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
        <h2 className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Client secret · CI bot
        </h2>
      </div>
      <p className="text-[11px] leading-snug mb-4" style={{ color: 'var(--fg-muted)' }}>
        Never commit this to source control. We rotated it 14 days ago; rotate again every 90 days as a habit.
      </p>
      <div
        className="flex items-center gap-2 h-10 px-3 rounded-md font-mono text-[12px]"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        <span className="flex-1 truncate">{shown ? real : secret}</span>
        <button
          type="button"
          onClick={() => { setShown((v) => !v); }}
          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[10px] font-medium transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {shown ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {shown ? 'Hide' : 'Reveal'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(real);
            }
          }}
          className="inline-flex items-center gap-1 h-7 px-2 rounded text-[10px] font-medium transition-colors"
          style={{ color: 'var(--fg-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Copy className="w-3 h-3" />
          Copy
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-[10px] font-semibold transition-colors"
          style={{
            color: 'var(--intent-danger-fg)',
            background: 'var(--intent-danger-bg)',
          }}
        >
          <RotateCcw className="w-3 h-3" />
          Rotate
        </button>
      </div>
    </div>
  );
}
