import { useRef } from 'react';
import { Trash2, Globe } from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import type { OAuthApp } from './types';

// NOTE: kept hand-rolled (not DataTable): the header strip has NO
// `--bg-surface-muted` background, rows are h-14 (DataTable hardcodes h-12),
// and the first row keeps its top border (DataTable drops it). Migrating would
// change the rendered table.
export function AppList({ apps, onDelete }: { apps: OAuthApp[]; onDelete: (a: OAuthApp) => void }) {
  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
      <div
        className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
        style={{
          gridTemplateColumns: '1fr 200px 90px 80px 32px',
          gap: 12,
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>App</span>
        <span>Redirect</span>
        <span>Status</span>
        <span>Installs</span>
        <span />
      </div>
      {apps.map((a) => (
        <AppRow key={a.id}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-[11px] font-black shrink-0"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--fg-accent), var(--fg-link))',
                color: 'var(--bg-canvas)',
              }}
            >
              {a.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0 gap-0.5">
              <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{a.name}</span>
              <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-subtle)' }}>
                {a.clientId} · {a.scopes.length} scope{a.scopes.length === 1 ? '' : 's'} · since {a.createdAt}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Globe className="w-3 h-3 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            <span className="font-mono text-[10px] truncate" style={{ color: 'var(--fg-default)' }}>
              {a.redirectUri}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-semibold px-1.5 py-0.5 rounded w-fit"
            style={{
              background: a.status === 'published' ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              color: a.status === 'published' ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
              border: `1px solid ${a.status === 'published' ? 'var(--intent-success-fg)' : 'var(--border-muted)'}`,
            }}
          >
            {a.status}
          </span>
          <span className="font-mono tabular-nums text-[12px]" style={{ color: 'var(--fg-default)' }}>
            {a.installs}
          </span>
          <button
            type="button"
            onClick={() => { onDelete(a); }}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center"
            style={{ color: 'var(--fg-subtle)' }}
            aria-label="Delete app"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </AppRow>
      ))}
    </div>
  );
}

function AppRow({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 h-14 text-[12px] transition-colors"
      style={{
        gridTemplateColumns: '1fr 200px 90px 80px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      {children}
    </div>
  );
}
