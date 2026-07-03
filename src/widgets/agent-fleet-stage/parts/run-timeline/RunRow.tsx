import type { Run, TranslateFn } from '../types';
import { relativeFromMs } from '../data';
import { BlastChip, RunStatusBadge } from './chips';

export function RunRow({
  run, active, onClick, isDark, t,
}: {
  run: Run;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';
  const baseTone = isDark
    ? (active ? 'bg-white/[0.06] border-white/[0.10]' : 'border-white/[0.06] hover:bg-white/[0.03]')
    : (active ? 'bg-black/[0.04] border-black/[0.10]' : 'border-black/[0.06] hover:bg-black/[0.02]');

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${baseTone}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <RunStatusBadge status={run.status} isDark={isDark} t={t} />
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
            <BlastChip tier={run.blastRadius} isDark={isDark} t={t} compact />
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
