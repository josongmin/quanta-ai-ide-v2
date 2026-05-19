import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ContextBundle,
  InvestigationTarget,
  QuestionType,
} from '@entities/investigation';
import {
  runPlanner,
  type PlannerStep,
  type PlannerTrace as PlannerTraceData,
} from '../../planner';

export function usePlannerRunner(opts: {
  activeTarget: InvestigationTarget | null;
  bundle: ContextBundle | null;
  questionType: QuestionType;
  panelOpen: boolean;
}): {
  plannerRunning: boolean;
  plannerSteps: PlannerStep[];
  plannerTrace: PlannerTraceData | null;
  runPlanner: () => void;
} {
  const { activeTarget, bundle, questionType, panelOpen } = opts;

  const [plannerRunning, setPlannerRunning] = useState(false);
  const [plannerSteps, setPlannerSteps] = useState<PlannerStep[]>([]);
  const [plannerTrace, setPlannerTrace] = useState<PlannerTraceData | null>(null);
  const plannerAbortRef = useRef<AbortController | null>(null);

  // Cancel + reset planner whenever the active target changes or the panel
  // closes — those make the trace stale. The setStates are paired with an
  // imperative AbortController.abort() side effect, so they must run from
  // an effect; deriving the running/steps/trace state from props would
  // lose the in-flight run's identity.
  useEffect(() => {
    if (plannerAbortRef.current) {
      plannerAbortRef.current.abort();
      plannerAbortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlannerRunning(false);
    setPlannerSteps([]);
    setPlannerTrace(null);
  }, [activeTarget?.id, panelOpen]);

  // Abort any in-flight run on unmount.
  useEffect(() => {
    return () => {
      if (plannerAbortRef.current) {
        plannerAbortRef.current.abort();
        plannerAbortRef.current = null;
      }
    };
  }, []);

  const runPlannerCb = useCallback(() => {
    if (!activeTarget || !bundle) return;
    if (plannerRunning) return;
    if (plannerAbortRef.current) {
      plannerAbortRef.current.abort();
    }
    const controller = new AbortController();
    plannerAbortRef.current = controller;
    setPlannerRunning(true);
    setPlannerSteps([]);
    setPlannerTrace(null);
    runPlanner({
      target: activeTarget,
      questionType,
      bundle,
      signal: controller.signal,
      onStep: (_step, allSoFar) => {
        if (controller.signal.aborted) return;
        setPlannerSteps([...allSoFar]);
      },
    })
      .then((trace) => {
        if (controller.signal.aborted) return;
        setPlannerTrace(trace);
        setPlannerRunning(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setPlannerRunning(false);
      });
  }, [activeTarget, bundle, questionType, plannerRunning]);

  return {
    plannerRunning,
    plannerSteps,
    plannerTrace,
    runPlanner: runPlannerCb,
  };
}
