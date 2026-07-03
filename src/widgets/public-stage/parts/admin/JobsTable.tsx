import { useRef } from 'react';
import {
  RefreshCw, Activity, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { useHoverStyle } from '@shared/lib';
import { Button } from '@shared/ui/forms';
import { JOBS } from './data';
import type { Job, JobState } from './types';

export function JobsTable() {
  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ border: '1px solid var(--border-muted)' }}
    >
      <div
        className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
        style={{
          gridTemplateColumns: '160px 1.2fr 110px 90px 70px 80px 130px',
          gap: 12,
          background: 'var(--bg-surface-muted)',
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>Job ID</span>
        <span>Type</span>
        <span>State</span>
        <span>Runtime</span>
        <span className="text-right">Retries</span>
        <span className="text-right">Payload</span>
        <span />
      </div>
      {JOBS.map((j) => <JobRow key={j.id} job={j} />)}
    </div>
  );
}

function JobRow({ job }: { job: Job }) {
  const isFailed = job.state === 'failed';
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { background: 'var(--bg-hover)' }, { background: 'transparent' });
  return (
    <div
      ref={ref}
      className="grid items-center px-3 h-11 text-base transition-colors"
      style={{
        gridTemplateColumns: '160px 1.2fr 110px 90px 70px 80px 130px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
    >
      <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>
        {job.id}
      </span>
      <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-muted)' }}>
        {job.type}
      </span>
      <JobStatePill state={job.state} />
      <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {job.runtime}
      </span>
      <span
        className="tabular-nums text-right text-sm"
        style={{ color: job.retries > 0 ? 'var(--intent-warn-fg)' : 'var(--fg-muted)' }}
      >
        {job.retries}
      </span>
      <span className="tabular-nums text-right text-sm" style={{ color: 'var(--fg-muted)' }}>
        {job.payload}
      </span>
      <div className="flex items-center justify-end gap-1.5">
        {isFailed ? (
          <Button leading={<RefreshCw className="w-3 h-3" />}>Re-run</Button>
        ) : (
          <Button leading={<RefreshCw className="w-3 h-3" />} disabled={job.state === 'completed'}>
            Re-run
          </Button>
        )}
        <Button variant="ghost">Kill</Button>
      </div>
    </div>
  );
}

const JOB_STATE_CFG: Record<
  JobState,
  { bg: string; fg: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  running:   { bg: 'var(--intent-info-bg)',    fg: 'var(--intent-info-fg)',    Icon: Activity },
  queued:    { bg: 'var(--intent-warn-bg)',    fg: 'var(--intent-warn-fg)',    Icon: Clock },
  failed:    { bg: 'var(--intent-danger-bg)',  fg: 'var(--intent-danger-fg)',  Icon: XCircle },
  completed: { bg: 'var(--intent-success-bg)', fg: 'var(--intent-success-fg)', Icon: CheckCircle2 },
};

function JobStatePill({ state }: { state: JobState }) {
  const cfg = JOB_STATE_CFG[state];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.fg}`,
        width: 'fit-content',
      }}
    >
      <Icon className="w-2.5 h-2.5" />
      {state}
    </span>
  );
}
