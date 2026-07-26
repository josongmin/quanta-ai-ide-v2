import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunDetail } from '../parts/run-timeline/RunDetail';
import { FleetRail } from '../parts/FleetRail';
import type { FleetHealth, HitlItem, Routine, Run } from '../parts/types';

// WBT-A2S — no-op action safety.
//
// The /agents surface renders primary actions (approve gate, adopt candidate,
// approve HITL, resolve conflict) that MUST perform a real backend transition.
// In a build with no command port those controls used to look active but do
// nothing — a fake success. These tests prove they are now honestly DISABLED
// and never invoke their handler when the port is absent.

// Identity translator so we assert against the raw key, not localized copy.
const t = (k: string) => k;

const GATED_RUN: Run = {
  id: 'run-1',
  routineId: 'r-1',
  startedAtMs: 0,
  status: 'awaiting-human',
  triggeredBy: 'cron',
  effectiveTrust: 3,
  costUsd: 0.1,
  steps: [
    { id: 'step-1', phase: 'plan', label: 'Plan approval', state: 'gated', hitlGate: 'plan-approval' },
  ],
  candidates: [
    { id: 'c-1', model: 'a', selfEval: 0.9, costUsd: 0.1, selected: true, approach: 'winner' },
    { id: 'c-2', model: 'b', selfEval: 0.7, costUsd: 0.1, selected: false, approach: 'runner-up' },
  ],
};

describe('RunDetail — unbacked gate/adopt controls', () => {
  it('disables approve-gate and does not fire when commands are unavailable', () => {
    const onApproveGate = vi.fn();
    const onAdoptCandidate = vi.fn();
    render(
      <RunDetail
        run={GATED_RUN}
        onApproveGate={onApproveGate}
        onAdoptCandidate={onAdoptCandidate}
        commandsEnabled={false}
        commandDisabledReason="no backend"
        t={t}
      />,
    );

    const gateBtn = screen.getByRole('button', { name: 'run.approveGate' });
    expect(gateBtn).toBeDisabled();
    expect(gateBtn).toHaveAttribute('title', 'no backend');

    // Clicking a disabled control must not fake success.
    fireEvent.click(gateBtn);
    expect(onApproveGate).not.toHaveBeenCalled();

    const adoptBtn = screen.getByRole('button', { name: 'run.candidateAdopt' });
    expect(adoptBtn).toBeDisabled();
    fireEvent.click(adoptBtn);
    expect(onAdoptCandidate).not.toHaveBeenCalled();
  });

  it('enables and fires the same controls when a command port is present', () => {
    const onApproveGate = vi.fn();
    const onAdoptCandidate = vi.fn();
    render(
      <RunDetail
        run={GATED_RUN}
        onApproveGate={onApproveGate}
        onAdoptCandidate={onAdoptCandidate}
        commandsEnabled
        commandDisabledReason="no backend"
        t={t}
      />,
    );

    const gateBtn = screen.getByRole('button', { name: 'run.approveGate' });
    expect(gateBtn).toBeEnabled();
    fireEvent.click(gateBtn);
    expect(onApproveGate).toHaveBeenCalledWith('step-1');

    fireEvent.click(screen.getByRole('button', { name: 'run.candidateAdopt' }));
    expect(onAdoptCandidate).toHaveBeenCalledWith('c-2');
  });
});

const HITL_ITEM: HitlItem = {
  id: 'h-1',
  runId: 'run-1',
  routineId: 'r-1',
  checkpoint: 'plan-approval',
  reason: 'plan ready',
  waitingMs: 1000,
  suggestedAction: 'Approve plan',
};

const HEALTH: FleetHealth = {
  running: 1,
  maxConcurrency: 4,
  queued: 0,
  spendLastHourUsd: 0,
  projectedDailyUsd: 0,
  alerts: [],
  weekRoi: { prsMerged: 0, locDeleted: 0, reviewHoursSaved: 0, totalSpentUsd: 0 },
  conflicts: [{ routineIdA: 'r-1', routineIdB: 'r-2', path: 'src/a.ts' }],
  attention: { spentHours: 1, budgetHours: 10 },
};

const ROUTINES: Routine[] = [];

describe('FleetRail — unbacked HITL / conflict controls', () => {
  it('disables HITL approve + conflict resolve, keeps jump-to-run live', () => {
    const onApproveHitl = vi.fn();
    const onResolveConflict = vi.fn();
    const onJumpToRun = vi.fn();
    render(
      <FleetRail
        health={HEALTH}
        hitl={[HITL_ITEM]}
        routines={ROUTINES}
        onApproveHitl={onApproveHitl}
        onResolveConflict={onResolveConflict}
        onJumpToRun={onJumpToRun}
        commandsEnabled={false}
        commandDisabledReason="no backend"
        t={t}
      />,
    );

    const approveBtn = screen.getByRole('button', { name: 'Approve plan' });
    expect(approveBtn).toBeDisabled();
    fireEvent.click(approveBtn);
    expect(onApproveHitl).not.toHaveBeenCalled();

    const resolveBtn = screen.getByRole('button', { name: 'fleet.conflictResolve' });
    expect(resolveBtn).toBeDisabled();
    fireEvent.click(resolveBtn);
    expect(onResolveConflict).not.toHaveBeenCalled();

    // Jump-to-run is pure local navigation and must stay functional.
    const jumpBtn = screen.getByRole('button', { name: 'Open run' });
    expect(jumpBtn).toBeEnabled();
    fireEvent.click(jumpBtn);
    expect(onJumpToRun).toHaveBeenCalledWith('run-1', 'r-1');
  });
});
