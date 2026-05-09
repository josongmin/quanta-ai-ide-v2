import type { CSSProperties } from 'react';
import { Wrench } from 'lucide-react';
import type { FixHandoffPayload } from './fixHandoff';

type Props = { payload: FixHandoffPayload | null };

export function HandoffNotice({ payload }: Props) {
  if (!payload) return null;

  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    border: '1px solid var(--border-default)',
    color: 'var(--fg-default)',
    fontSize: '11px',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md px-2.5 py-1.5 inline-flex items-center gap-2"
      style={style}
    >
      <Wrench size={12} aria-hidden="true" style={{ color: 'var(--fg-subtle)' }} />
      <span>Sending evidence to fix pipeline…</span>
      <span
        className="font-mono truncate"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px', maxWidth: 220 }}
        title={payload.target.label}
      >
        {payload.target.label}
      </span>
    </div>
  );
}
