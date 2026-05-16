import { useMemo, useState } from 'react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { RoutineRail } from './parts/RoutineRail';
import { RunTimeline, pickRunsFor } from './parts/RunTimeline';
import { FleetRail } from './parts/FleetRail';
import RoutineEditorModal from './parts/RoutineEditorModal';
import {
  SAMPLE_FLEET_HEALTH, SAMPLE_HITL_QUEUE, SAMPLE_ROUTINES,
} from './parts/data';
import type { Routine } from './parts/types';

// /agents — fleet console for background coding agents.
// Three-pane layout mirrors /coding so the operator's mental model is
// shared: Routines (definitions) | Runs (instances) | Fleet (health).

export default function AgentFleetStage() {
  const { isDark } = useTheme();
  const { t } = useTranslation('agents');

  const [routines, setRoutines] = useState<Routine[]>(() => SAMPLE_ROUTINES);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(SAMPLE_ROUTINES[0]?.id ?? null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const activeRoutine = useMemo(
    () => routines.find((r) => r.id === activeRoutineId) ?? null,
    [routines, activeRoutineId],
  );

  const runs = useMemo(
    () => (activeRoutineId ? pickRunsFor(activeRoutineId) : []),
    [activeRoutineId],
  );

  // Pick the first non-completed run as the default detail target,
  // falling back to the most recent.
  const resolvedRunId = useMemo(() => {
    if (activeRunId && runs.some((r) => r.id === activeRunId)) return activeRunId;
    const live = runs.find((r) => r.status === 'running' || r.status === 'awaiting-human');
    return live?.id ?? runs[0]?.id ?? null;
  }, [activeRunId, runs]);

  const surface = isDark ? 'bg-[#0d1117]' : 'bg-[#f7f8fa]';

  function onApproveGate(_runId: string, _stepId: string) {
    // Demo no-op: a real impl would advance the run past the gate.
    // Using void return on purpose so the action looks responsive.
  }
  function onAdoptCandidate(_runId: string, _candidateId: string) {
    /* demo no-op */
  }
  function onApproveHitl(_id: string) {
    /* demo no-op */
  }
  function onJumpFromHitl(runId: string, routineId: string) {
    setActiveRoutineId(routineId);
    setActiveRunId(runId);
  }
  function saveRoutine(next: Routine) {
    setRoutines((cur) => cur.map((r) => (r.id === next.id ? next : r)));
    setEditorOpen(false);
  }
  function newRoutine() {
    const id = `r-${Date.now().toString(36)}`;
    const draft: Routine = {
      id, kind: 'quality-sweeper', name: 'Untitled routine',
      description: 'Describe what this routine should do.',
      status: 'draft',
      trigger: { kind: 'cron', spec: '0 4 * * *', humanLabel: 'Every day at 04:00' },
      trustLevel: 2,
      scope: { repos: ['acme/monorepo'] },
      guardrails: {
        maxLocPerPr: 30, forbiddenPaths: [],
        confidenceFloor: 0.8, requireGreenCi: true, hitlCheckpoints: [],
      },
      budget: { dailyUsd: 2, weeklyUsd: 10, perRunUsd: 0.5 },
      outputKind: 'pr',
      memoryItemCount: 0,
      metrics: {
        runs30d: 0, prsMerged30d: 0, prsRejected30d: 0, issuesOpened30d: 0,
        successRate: 0, avgLocPerPr: 0, reviewerTouches: 0,
        spentUsd: 0, netLocDelta: 0, reviewHoursSaved: 0,
      },
    };
    setRoutines((cur) => [draft, ...cur]);
    setActiveRoutineId(id);
    setEditorOpen(true);
  }

  return (
    <div className={`absolute inset-0 flex flex-col font-sans ${surface}`}>
      <RoiRibbon isDark={isDark} t={t} />
      <div className="flex-1 min-h-0 flex">
        <RoutineRail
          routines={routines}
          activeId={activeRoutineId}
          onSelect={(id) => { setActiveRoutineId(id); setActiveRunId(null); }}
          onNew={newRoutine}
          isDark={isDark}
          t={t}
        />
        <RunTimeline
          routine={activeRoutine}
          runs={runs}
          activeRunId={resolvedRunId}
          onSelectRun={setActiveRunId}
          onApproveGate={onApproveGate}
          onAdoptCandidate={onAdoptCandidate}
          onEditRoutine={() => { setEditorOpen(true); }}
          isDark={isDark}
          t={t}
        />
        <FleetRail
          health={SAMPLE_FLEET_HEALTH}
          hitl={SAMPLE_HITL_QUEUE}
          routines={routines}
          onApproveHitl={onApproveHitl}
          onJumpToRun={onJumpFromHitl}
          isDark={isDark}
          t={t}
        />
      </div>
      {editorOpen && activeRoutine && (
        <RoutineEditorModal
          routine={activeRoutine}
          isDark={isDark}
          t={t}
          onClose={() => { setEditorOpen(false); }}
          onSave={saveRoutine}
        />
      )}
    </div>
  );
}

function RoiRibbon({
  isDark, t,
}: {
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const roi = SAMPLE_FLEET_HEALTH.weekRoi;
  const panel = isDark ? 'bg-[#11161e]' : 'bg-white';
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const labelTone = isDark ? 'text-white/40' : 'text-black/40';
  const heading = isDark ? 'text-white/85' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';

  return (
    <div className={`shrink-0 h-14 flex items-center justify-between px-5 border-b ${border} ${panel}`}>
      <div className="flex items-baseline gap-2">
        <span className={`text-[14px] font-semibold ${heading}`}>{t('header.title')}</span>
        <span className={`text-[11px] ${muted}`}>{t('header.subtitle')}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${labelTone}`}>
          {t('header.weekRoi')}
        </span>
        <RoiStat value={String(roi.prsMerged)}      label={t('header.roi.prsMerged', { n: roi.prsMerged })}      isDark={isDark} />
        <RoiStat value={String(roi.locDeleted)}     label={t('header.roi.locDeleted', { n: roi.locDeleted })}    isDark={isDark} />
        <RoiStat value={`${roi.reviewHoursSaved.toFixed(1)}h`} label={t('header.roi.hoursSaved', { h: roi.reviewHoursSaved.toFixed(1) })} isDark={isDark} />
        <RoiStat value={`$${roi.totalSpentUsd.toFixed(2)}`}    label={t('header.roi.spent', { usd: roi.totalSpentUsd.toFixed(2) })}      isDark={isDark} />
      </div>
    </div>
  );
}

function RoiStat({ value, label, isDark }: { value: string; label: string; isDark: boolean }) {
  const muted = isDark ? 'text-white/45' : 'text-black/55';
  return (
    <div className="text-right" title={label}>
      <div className={`text-[12px] font-mono tabular-nums ${isDark ? 'text-white/85' : 'text-black/85'}`}>{value}</div>
      <div className={`text-[9px] font-mono ${muted}`}>{label}</div>
    </div>
  );
}
