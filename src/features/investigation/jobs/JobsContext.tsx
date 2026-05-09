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

type Ctx = {
  jobs: Job[];
  enqueue: (kind: JobKind, target: InvestigationTarget, label?: string) => string;
  cancel: (id: string) => void;
  clearCompleted: () => void;
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

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>(FIXTURE_JOBS);
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

  const advance = useCallback((id: string) => {
    setJobs((cur) => {
      const idx = cur.findIndex((j) => j.id === id);
      if (idx === -1) return cur;
      const j = cur[idx]!;
      if (j.status === 'cancelled' || j.status === 'completed' || j.status === 'failed') {
        return cur;
      }
      const nextProgress = Math.min(1, j.progress + 0.2);
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
        const t = setTimeout(() => advance(id), 600);
        timersRef.current.set(id, t);
      } else {
        timersRef.current.delete(id);
      }
      return next;
    });
  }, []);

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
    // Kick off after a short tick so consumers see the queued state briefly.
    const t = setTimeout(() => advance(id), 400);
    timersRef.current.set(id, t);
    return id;
  }, [advance]);

  const cancel = useCallback((id: string) => {
    clearTimerFor(id);
    setJobs((cur) =>
      cur.map((j) => {
        if (j.id !== id) return j;
        if (j.status === 'completed' || j.status === 'cancelled' || j.status === 'failed') return j;
        return { ...j, status: 'cancelled', finishedAt: Date.now() };
      }),
    );
  }, [clearTimerFor]);

  const clearCompleted = useCallback(() => {
    setJobs((cur) =>
      cur.filter(
        (j) => j.status !== 'completed' && j.status !== 'cancelled' && j.status !== 'failed',
      ),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({ jobs, enqueue, cancel, clearCompleted }),
    [jobs, enqueue, cancel, clearCompleted],
  );

  return <JobsCtx.Provider value={value}>{children}</JobsCtx.Provider>;
}

export function useJobs(): Ctx {
  const ctx = useContext(JobsCtx);
  if (!ctx) throw new Error('useJobs must be used inside JobsProvider');
  return ctx;
}
