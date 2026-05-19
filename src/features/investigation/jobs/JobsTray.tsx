import { type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from '@shared/ui';
import { useJobs } from './JobsContext';
import { JobRow } from './JobRow';

// Popup surfaced from the status-bar Jobs button. `open` lives in
// JobsContext so the bar (in AppShell) and this tray (in the layout)
// share one source of truth. Anchored just above the status bar so it
// reads as "pulled up out of the bar".
export function JobsTray() {
  const { jobs, cancel, clearCompleted, open, setOpen } = useJobs();

  if (!open || jobs.length === 0) return null;

  const completedCount = jobs.filter(
    (j) => j.status === 'completed' || j.status === 'cancelled' || j.status === 'failed',
  ).length;

  const headerStyle: CSSProperties = {
    borderBottom: '1px solid var(--border-default)',
    color: 'var(--fg-strong)',
    fontSize: '11px',
  };

  const footerStyle: CSSProperties = {
    borderTop: '1px solid var(--border-default)',
    color: 'var(--fg-muted)',
    fontSize: '10px',
  };

  const countStyle: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color: 'var(--fg-muted)',
    border: '1px solid var(--border-default)',
    fontSize: '9px',
  };

  return (
    <div
      className="fixed left-3 z-50 pointer-events-auto"
      style={{ bottom: 'calc(var(--app-statusbar-h, 24px) + 8px)' }}
    >
      <GlassCard
        className="rounded-lg overflow-hidden"
        style={{ width: 320 }}
      >
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={headerStyle}
        >
          <span className="font-mono uppercase tracking-wider flex-1">
            Investigation jobs
          </span>
          <span
            style={countStyle}
            className="inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
          >
            {jobs.length}
          </span>
          <button
            type="button"
            onClick={() => { setOpen(false); }}
            title="Close"
            aria-label="Close jobs"
            className="p-0.5 rounded hover:[background:var(--bg-hover)]"
            style={{ color: 'var(--fg-muted)' }}
          >
            <ChevronDown size={12} aria-hidden="true" />
          </button>
        </div>
        <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={cancel} />
          ))}
        </div>
        <div
          className="flex items-center justify-between px-2.5 py-1.5"
          style={footerStyle}
        >
          <span>
            {completedCount} settled · {jobs.length - completedCount} active
          </span>
          <button
            type="button"
            onClick={clearCompleted}
            disabled={completedCount === 0}
            style={{
              color: completedCount === 0 ? 'var(--fg-subtle)' : 'var(--fg-default)',
              cursor: completedCount === 0 ? 'not-allowed' : 'pointer',
              opacity: completedCount === 0 ? 0.5 : 1,
            }}
            className="font-mono uppercase tracking-wider px-1.5 py-0.5 rounded hover:[background:var(--bg-hover)]"
          >
            Clear completed
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default JobsTray;
