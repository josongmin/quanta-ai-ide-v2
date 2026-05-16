import { useEffect, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { GlassCard } from '@shared/ui';
import {
  clearHandoffBreadcrumb,
  readHandoffBreadcrumb,
  type FixHandoffBreadcrumb,
} from './fixHandoff';

export function HandoffBreadcrumb() {
  const navigate = useNavigate();
  const [crumb, setCrumb] = useState<FixHandoffBreadcrumb | null>(() => readHandoffBreadcrumb());

  // Best-effort: re-check after mount in case the crumb was set after the
  // first render (the navigate happens synchronously, but the destination
  // may mount on a microtask boundary where the slot is already populated).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCrumb(readHandoffBreadcrumb()); }, []);

  if (!crumb) return null;

  const handleBack = () => {
    void navigate({ to: '/intelligence' });
  };

  const handleDismiss = () => {
    clearHandoffBreadcrumb();
    setCrumb(null);
  };

  return (
    <div
      className="fixed top-3 left-3 z-50 pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      <GlassCard className="rounded-md">
        <div className="px-2.5 py-1.5 flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back to investigation"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:[background:var(--bg-hover)]"
            style={{ color: 'var(--fg-default)', cursor: 'pointer' }}
          >
            <ChevronLeft size={12} aria-hidden="true" />
            <span style={{ fontSize: 10 }}>Back</span>
          </button>
          <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>
            From investigation:
          </span>
          <span
            className="font-mono"
            style={{ color: 'var(--fg-default)', fontSize: 10 }}
          >
            {crumb.target.label}
          </span>
          <span style={{ color: 'var(--fg-subtle)', fontSize: 10 }}>
            · {crumb.evidenceCount.toString()} evidence
          </span>
          {crumb.hypothesisStatement ? (
            <span
              className="truncate"
              style={{
                color: 'var(--fg-muted)',
                fontSize: 10,
                maxWidth: 240,
              }}
              title={crumb.hypothesisStatement}
            >
              · {crumb.hypothesisStatement}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss breadcrumb"
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
