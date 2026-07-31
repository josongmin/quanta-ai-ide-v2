import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  FIXTURE_JOBS,
  type InvestigationTarget,
  type Job,
  type JobKind,
} from '@entities/investigation';
import { isTerminalJobStatus } from './jobStatus';

type Ctx = {
  jobs: Job[];
  enqueue: (kind: JobKind, target: InvestigationTarget, label?: string) => string;
  cancel: (id: string) => void;
  clearCompleted: () => void;
  // Tray UI open state. Driven by the status-bar Jobs button — the tray
  // no longer floats unconditionally; it pops up from the bar on demand.
  open: boolean;
  setOpen: (v: boolean) => void;
};

const JobsCtx = createContext<Ctx | null>(null);

const KIND_LABEL: Record<JobKind, string> = {
  deep_scan: 'Deep scan',
  whole_repo_blast: 'Whole-repo blast',
  runtime_correlate: 'Runtime correlate',
  refactor_plan: 'Refactor plan',
};

function makeJobId(): string {
  return `job-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

function defaultLabel(kind: JobKind, target: InvestigationTarget): string {
  return `${KIND_LABEL[kind]}: ${target.label}`;
}

function summaryFor(kind: JobKind, target: InvestigationTarget): string {
  switch (kind) {
    case 'deep_scan':
      return `Resolved 9 of 11 dispatch sites on ${target.label}; 2 require runtime data.`;
    case 'whole_repo_blast':
      return `Found 14 reachable callers of ${target.label}; 3 cross-boundary.`;
    case 'runtime_correlate':
      return `Correlated 38 spans against ${target.label}; high-confidence match window 4m.`;
    case 'refactor_plan':
      return `Drafted 3-step refactor plan for ${target.label}; estimated 1d effort.`;
  }
}

// Per-kind timing — heavier analyses tick slower, lighter ones snap. Matches
// the rough cost ordering of the real backend ops these stand in for.
const KIND_TIMING: Record<JobKind, { stepMs: number; progressDelta: number; queueMs: number }> = {
  deep_scan:        { stepMs: 700,  progressDelta: 0.18, queueMs: 350 },
  refactor_plan:    { stepMs: 600,  progressDelta: 0.20, queueMs: 250 },
  runtime_correlate:{ stepMs: 900,  progressDelta: 0.14, queueMs: 500 },
  whole_repo_blast: { stepMs: 1100, progressDelta: 0.12, queueMs: 700 },
};

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(FIXTURE_JOBS);
  // Closed by default — surfaced via the status-bar Jobs button.
  const [open, setOpen] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimerFor = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  // `advance` recurses through `setTimeout` to keep ticking until the job
  // completes. We thread the recursion through a ref initialized lazily on
  // first call so the binding is reachable before the `useCallback`
  // initializer settles (TDZ-safe) without writing the ref during render.
  const advanceRef = useRef<(id: string) => void>(() => { /* set by effect after first render */ });
  const advance = useCallback((id: string) => {
    setJobs((cur) => {
      const idx = cur.findIndex((j) => j.id === id);
      if (idx === -1) return cur;
      const j = cur[idx];
      if (isTerminalJobStatus(j.status)) {
        return cur;
      }
      const timing = KIND_TIMING[j.kind];
      const nextProgress = Math.min(1, j.progress + timing.progressDelta);
      const isDone = nextProgress >= 1;
      const updated: Job = isDone
        ? {
            ...j,
            progress: 1,
            status: 'completed',
            finishedAt: Date.now(),
            result: { summary: summaryFor(j.kind, j.target) },
          }
        : { ...j, progress: nextProgress, status: 'running' };
      const next = [...cur];
      next[idx] = updated;
      if (!isDone) {
        const t = setTimeout(() => { advanceRef.current(id); }, timing.stepMs);
        timersRef.current.set(id, t);
      } else {
        timersRef.current.delete(id);
      }
      return next;
    });
  }, []);
  useEffect(() => { advanceRef.current = advance; }, [advance]);

  const enqueue = useCallback((kind: JobKind, target: InvestigationTarget, label?: string): string => {
    const id = makeJobId();
    const job: Job = {
      id,
      kind,
      label: label ?? defaultLabel(kind, target),
      target,
      status: 'queued',
      progress: 0,
      startedAt: Date.now(),
    };
    setJobs((cur) => [job, ...cur]);
    // Per-kind queue delay — heavier ops sit in the queue longer.
    const t = setTimeout(() => { advance(id); }, KIND_TIMING[kind].queueMs);
    timersRef.current.set(id, t);
    return id;
  }, [advance]);

  const cancel = useCallback((id: string) => {
    clearTimerFor(id);
    setJobs((cur) =>
      cur.map((j) => {
        if (j.id !== id) return j;
        if (isTerminalJobStatus(j.status)) return j;
        return { ...j, status: 'cancelled', finishedAt: Date.now() };
      }),
    );
  }, [clearTimerFor]);

  const clearCompleted = useCallback(() => {
    setJobs((cur) =>
      cur.filter((j) => !isTerminalJobStatus(j.status)),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({ jobs, enqueue, cancel, clearCompleted, open, setOpen }),
    [jobs, enqueue, cancel, clearCompleted, open, setOpen],
  );

  return <JobsCtx.Provider value={value}>{children}</JobsCtx.Provider>;
}

export function useJobs(): Ctx {
  const ctx = useContext(JobsCtx);
  if (!ctx) throw new Error('useJobs must be used inside JobsProvider');
  return ctx;
}
