import type { CSSProperties, ComponentType } from 'react';
import {
  Search,
  Radar,
  Activity,
  Wrench,
  X,
  type LucideProps,
} from 'lucide-react';
import type { Job, JobKind, JobStatus } from '@entities/investigation';
import { isActiveJobStatus } from './jobStatus';

type Props = {
  job: Job;
  onCancel?: (id: string) => void;
};

const KIND_ICON: Record<JobKind, ComponentType<LucideProps>> = {
  deep_scan: Search,
  whole_repo_blast: Radar,
  runtime_correlate: Activity,
  refactor_plan: Wrench,
};

const STATUS_TONE: Record<JobStatus, { fg: string; label: string }> = {
  queued: { fg: 'var(--fg-muted)', label: 'queued' },
  running: { fg: 'var(--fg-default)', label: 'running' },
  partial: { fg: 'var(--fg-default)', label: 'partial' },
  stale: { fg: 'var(--intent-warning-vivid)', label: 'stale' },
  completed: { fg: 'var(--intent-success-vivid)', label: 'done' },
  cancelled: { fg: 'var(--fg-subtle)', label: 'cancelled' },
  failed: { fg: 'var(--intent-danger-vivid)', label: 'failed' },
};

function StatusPill({ status }: { status: JobStatus }) {
  const tone = STATUS_TONE[status];
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color: tone.fg,
    border: '1px solid var(--border-default)',
    fontSize: '9px',
    lineHeight: 1.1,
  };
  return (
    <span
      style={style}
      className="inline-flex items-center px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
    >
      {tone.label}
    </span>
  );
}

export function JobRow({ job, onCancel }: Props) {
  const Icon = KIND_ICON[job.kind];
  const isActive = isActiveJobStatus(job.status);

  const rowStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-muted)',
  };
  const barTrack: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  };
  const barFill: CSSProperties = {
    width: `${Math.round(job.progress * 100)}%`,
    height: '100%',
    background: 'var(--intent-success-vivid)',
    transition: 'width 250ms ease-out',
  };

  return (
    <div className="px-2.5 py-2 flex flex-col gap-1.5" style={rowStyle}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={12} aria-hidden="true" style={{ color: 'var(--fg-muted)' }} />
        <span
          className="flex-1 min-w-0 truncate"
          style={{ color: 'var(--fg-default)', fontSize: '11px' }}
          title={job.label}
        >
          {job.label}
        </span>
        <StatusPill status={job.status} />
        {onCancel && isActive ? (
          <button
            type="button"
            onClick={() => { onCancel(job.id); }}
            title="Cancel job"
            className="p-0.5 rounded hover:[background:var(--bg-hover)]"
            style={{ color: 'var(--fg-muted)' }}
          >
            <X size={11} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div style={barTrack}>
        <div style={barFill} />
      </div>
      {job.status === 'completed' && job.result ? (
        <div
          style={{
            color: 'var(--fg-subtle)',
            fontSize: '10px',
            lineHeight: 1.4,
          }}
        >
          {job.result.summary}
        </div>
      ) : null}
    </div>
  );
}

export default JobRow;
