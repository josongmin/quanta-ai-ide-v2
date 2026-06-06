import { useRef } from 'react';
import {
  Database, Download, RefreshCw, Terminal, Play,
  ShieldAlert, AlertTriangle,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { Button } from '@shared/ui/forms';

export function DataToolsGrid() {
  const tools = [
    { id: 't1', icon: Terminal, title: 'Run SQL query',       desc: 'Read-only access to the analytics replica.' },
    { id: 't2', icon: Download, title: 'Export org data',     desc: 'Generate a signed URL with full tenant export.' },
    { id: 't3', icon: RefreshCw, title: 'Re-index search',    desc: 'Rebuild the search index for one or all tenants.' },
    { id: 't4', icon: Play,     title: 'Replay event stream', desc: 'Re-emit events in a time window for one tenant.' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <DataToolCard key={t.id}>
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--bg-surface-muted)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--fg-default)',
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 gap-0.5">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  {t.title}
                </span>
                <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  {t.desc}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button leading={<Database className="w-3 h-3" />}>Open</Button>
            </div>
          </DataToolCard>
        );
      })}
    </div>
  );
}

function DataToolCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(
    ref,
    { background: 'var(--bg-hover)' },
    { background: 'var(--bg-canvas)' },
  );
  return (
    <div
      ref={ref}
      className="flex flex-col gap-3 p-4 rounded-md"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      {children}
    </div>
  );
}

export function DangerBand() {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-md"
      style={{
        background: 'var(--intent-danger-bg)',
        border: '1px solid var(--intent-danger-fg)',
        color: 'var(--intent-danger-fg)',
      }}
    >
      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
          Audit logging is mandatory
        </span>
        <p className="text-[12px] leading-snug" style={{ opacity: 0.9 }}>
          Every action here is logged with operator identity, IP, and timestamp.
          Impersonation sessions are visible to the target organization&apos;s owners
          and security contacts. Treat this surface as a recorded environment.
        </p>
      </div>
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
    </div>
  );
}
