import type { JobStatus } from '@entities/investigation';

// Single source of truth for job lifecycle predicates. The
// `completed || cancelled || failed` (settled) and `running || queued`
// (active) checks were copy-pasted across JobsContext, JobsTray, and JobRow;
// centralizing them keeps the lifecycle definition in one place so adding a
// new terminal/active status is a one-line edit (Open/Closed).

const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'completed',
  'cancelled',
  'failed',
]);

const ACTIVE_STATUSES: ReadonlySet<JobStatus> = new Set<JobStatus>([
  'running',
  'queued',
]);

/** A job that has settled — done, cancelled, or failed (no more ticks). */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** A job still in flight — running or waiting in the queue. */
export function isActiveJobStatus(status: JobStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}
