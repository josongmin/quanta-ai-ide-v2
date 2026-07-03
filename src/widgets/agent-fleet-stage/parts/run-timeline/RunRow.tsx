import type { Run, TranslateFn } from '../types';
import { relativeFromMs } from '../data';
import { BlastChip, RunStatusBadge } from './chips';

export function RunRow({
  run, active, onClick, t,
}: {
  run: Run;
  active: boolean;
  onClick: () => void;
  t: TranslateFn;
}) {
  const heading = 'text-[var(--fg-default)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const baseTone = active
    ? 'bg-[var(--bg-elevated)] border-[var(--border-strong)]'
    : 'border-[var(--border-default)] hover:bg-[var(--bg-surface-muted)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${baseTone}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <RunStatusBadge status={run.status} t={t} />
        <span className={`text-base font-mono ${heading}`}>{run.id}</span>
        <span className={`text-xs font-mono ${faint} ml-auto`}>
          {t('run.started', { when: relativeFromMs(run.startedAtMs) })}
        </span>
      </div>
      <div className={`flex items-center gap-2 text-xs font-mono ${muted}`}>
        <span className="truncate">{run.triggeredBy}</span>
        <span className={faint}>·</span>
        <span>${run.costUsd.toFixed(2)}</span>
        {run.blastRadius && (
          <>
            <span className={faint}>·</span>
            <BlastChip tier={run.blastRadius} t={t} compact />
          </>
        )}
        {run.output && (
          <>
            <span className={faint}>·</span>
            <span className={muted}>
              {run.output.kind === 'pr' ? `PR #${run.output.number}`
                : run.output.kind === 'issue' ? `Issue #${run.output.number}`
                : run.output.title}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
