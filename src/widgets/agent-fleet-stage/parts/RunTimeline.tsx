import { useMemo } from 'react';
import { MoreHorizontal, Pause, Play } from 'lucide-react';
import type { Routine, Run, TranslateFn } from './types';
import { runsForRoutine } from './data';
import { StatusPill, TrustChip } from './run-timeline/chips';
import { RoutineSummary } from './run-timeline/RoutineSummary';
import { RunRow } from './run-timeline/RunRow';
import { RunDetail } from './run-timeline/RunDetail';

export function RunTimeline({
  routine,
  runs,
  activeRunId,
  onSelectRun,
  onApproveGate,
  onAdoptCandidate,
  onEditRoutine,
  isDark,
  t,
}: {
  routine: Routine | null;
  runs: Run[];
  activeRunId: string | null;
  onSelectRun: (id: string) => void;
  onApproveGate: (runId: string, stepId: string) => void;
  onAdoptCandidate: (runId: string, candidateId: string) => void;
  onEditRoutine: () => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const faint = isDark ? 'text-white/30' : 'text-black/40';

  const activeRun = useMemo(
    () => runs.find((r) => r.id === activeRunId) ?? runs[0],
    [runs, activeRunId],
  );

  if (!routine) {
    return (
      <section className="flex-1 min-w-0 flex items-center justify-center">
        <div className={`text-center ${muted}`}>
          <div className={`text-[14px] font-semibold ${heading} mb-1`}>{t('empty.title')}</div>
          <div className="text-[12px] max-w-[320px]">{t('empty.subtitle')}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className={`shrink-0 h-12 flex items-center justify-between px-5 border-b ${border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[12px] font-semibold truncate ${heading}`}>{routine.name}</span>
          <span className={faint}>·</span>
          <StatusPill status={routine.status} isDark={isDark} t={t} />
          <span className={faint}>·</span>
          <TrustChip level={routine.trustLevel} isDark={isDark} t={t} />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEditRoutine}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
            }`}
          >
            {t('editor.open')}
          </button>
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
              isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
            }`}
          >
            {routine.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {routine.status === 'active' ? t('actions.pause') : t('actions.resume')}
          </button>
          <button
            type="button"
            aria-label="More"
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <div className="max-w-[840px] mx-auto px-6 py-6 space-y-5">
          <RoutineSummary routine={routine} isDark={isDark} t={t} />

          <div>
            <div className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${faint}`}>
              {t('run.header')}
            </div>
            {runs.length === 0 ? (
              <div className={`px-3 py-6 text-center text-[11px] ${muted}`}>
                {t('run.empty')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {runs.map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    active={run.id === activeRun?.id}
                    onClick={() => { onSelectRun(run.id); }}
                    isDark={isDark}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>

          {activeRun && (
            <RunDetail
              run={activeRun}
              onApproveGate={(stepId) => { onApproveGate(activeRun.id, stepId); }}
              onAdoptCandidate={(cId) => { onAdoptCandidate(activeRun.id, cId); }}
              isDark={isDark}
              t={t}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// Helper export so other modules can re-derive runs for a routine without
// importing data.ts directly.
export function pickRunsFor(routineId: string): Run[] {
  return runsForRoutine(routineId);
}
