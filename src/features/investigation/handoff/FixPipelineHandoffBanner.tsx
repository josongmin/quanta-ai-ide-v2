import { useEffect, useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { GlassCard } from '@shared/ui';
import { consumePendingHandoff, type FixHandoffPayload } from './fixHandoff';

export function FixPipelineHandoffBanner() {
  const [payload, setPayload] = useState<FixHandoffPayload | null>(null);

  useEffect(() => {
    const p = consumePendingHandoff();
    if (!p) return;
    // `consumePendingHandoff` has side effects (one-shot read of module
    // state), so it must run in an effect — we then mirror the payload
    // into local state so the banner has something to render and auto-
    // dismiss. Synchronous setState here is unavoidable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPayload(p);
    const t = window.setTimeout(() => { setPayload(null); }, 8000);
    return () => { window.clearTimeout(t); };
  }, []);

  if (!payload) return null;

  const evidenceCount = payload.evidence.length;

  return (
    <div
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <GlassCard className="rounded-md">
        <div className="px-3 py-2 flex items-center gap-3 text-[11px]">
          <Wrench size={14} style={{ color: 'var(--intent-success-vivid)' }} aria-hidden="true" />
          <div className="flex flex-col leading-tight">
            <span style={{ color: 'var(--fg-default)' }} className="font-semibold">
              Evidence handed off to fix pipeline
            </span>
            <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }} className="font-mono">
              {payload.target.label} · {evidenceCount.toString()} evidence
              {payload.hypothesis ? ' · 1 hypothesis' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setPayload(null); }}
            aria-label="Dismiss handoff banner"
            className="rounded p-0.5 transition-colors hover:[background:var(--bg-hover)]"
            style={{ color: 'var(--fg-subtle)', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
