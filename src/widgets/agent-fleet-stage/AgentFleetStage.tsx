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

  const surface = 'bg-[var(--bg-canvas)]';

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
      <RoiRibbon t={t} />
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
  t,
}: {
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const roi = SAMPLE_FLEET_HEALTH.weekRoi;
  const panel = 'bg-[var(--bg-surface)]';
  const border = 'border-[var(--border-default)]';
  const labelTone = 'text-[var(--fg-subtle)]';
  const heading = 'text-[var(--fg-default)]';
  const muted = 'text-[var(--fg-muted)]';

  return (
    <div className={`shrink-0 h-14 flex items-center justify-between px-5 border-b ${border} ${panel}`}>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-semibold ${heading}`}>{t('header.title')}</span>
        <span className={`text-sm ${muted}`}>{t('header.subtitle')}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className={`text-xs font-bold uppercase tracking-eyebrow ${labelTone}`}>
          {t('header.weekRoi')}
        </span>
        <RoiStat value={String(roi.prsMerged)}      label={t('header.roi.prsMerged', { n: roi.prsMerged })}      />
        <RoiStat value={String(roi.locDeleted)}     label={t('header.roi.locDeleted', { n: roi.locDeleted })}    />
        <RoiStat value={`${roi.reviewHoursSaved.toFixed(1)}h`} label={t('header.roi.hoursSaved', { h: roi.reviewHoursSaved.toFixed(1) })} />
        <RoiStat value={`$${roi.totalSpentUsd.toFixed(2)}`}    label={t('header.roi.spent', { usd: roi.totalSpentUsd.toFixed(2) })}      />
      </div>
    </div>
  );
}

function RoiStat({ value, label }: { value: string; label: string }) {
  const muted = 'text-[var(--fg-subtle)]';
  return (
    <div className="text-right" title={label}>
      <div className={`text-base font-mono tabular-nums text-[var(--fg-default)]`}>{value}</div>
      <div className={`text-2xs font-mono ${muted}`}>{label}</div>
    </div>
  );
}
