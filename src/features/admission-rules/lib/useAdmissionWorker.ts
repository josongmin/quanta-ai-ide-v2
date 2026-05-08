// Worker client for admission evaluation.
//
// Lazy-init contract: the Worker is created the first time any consumer calls
// the hook (and stays alive for the rest of the session). We multiplex many
// concurrent requests onto one worker via a monotonically-increasing `id` and
// a pending-request map; responses route back to the matching resolver.
// The hook returns Promise-returning wrappers that mirror evaluate.ts; the
// repo shape sent across is the minimal `RepoSnapshot` (just `files`).

import { useEffect, useMemo, useRef } from 'react';
import type { RepoData, PRDiff } from '@entities/repo';
import type { AdmissionRule, RulePreview, AdmissionDecision } from '@entities/admission';
import type {
  AdmissionWorkerReq,
  AdmissionWorkerRes,
  RepoSnapshot,
} from '@entities/admission/lib/evaluate.worker';

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

// Singleton worker — one process per app session. Lazily created on first
// `getWorker()` call to avoid spinning up a thread on screens that never
// touch admission rules.
let workerSingleton: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (workerSingleton) return workerSingleton;
  const w = new Worker(
    new URL('../../../entities/admission/lib/evaluate.worker.ts', import.meta.url),
    { type: 'module' },
  );
  w.onmessage = (e: MessageEvent<AdmissionWorkerRes>) => {
    const res = e.data;
    const p = pending.get(res.id);
    if (!p) return;
    pending.delete(res.id);
    if (res.ok) p.resolve(res.result);
    else p.reject(new Error(res.error));
  };
  w.onerror = (ev) => {
    // Fail every in-flight request with the worker error so callers can show
    // a fallback rather than hang. The worker stays around — the next call
    // will start fresh.
    const err = new Error(ev.message || 'admission worker error');
    for (const [, p] of pending) p.reject(err);
    pending.clear();
  };
  workerSingleton = w;
  return w;
}

function toSnapshot(repo: RepoData): RepoSnapshot {
  // Only `files` is read by evaluate.ts; everything else (folders, Maps,
  // ranges) is left out to keep the structuredClone cost bounded.
  return { files: repo.files };
}

function send<T>(req: AdmissionWorkerReq): Promise<T> {
  const w = getWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(req.id, {
      resolve: (v) => { resolve(v as T); },
      reject,
    });
    w.postMessage(req);
  });
}

export type AdmissionWorkerHandle = {
  previewRule: (rule: AdmissionRule, repo: RepoData, prDiff?: PRDiff | null) => Promise<RulePreview>;
  evaluate: (rules: AdmissionRule[], repo: RepoData, diff: PRDiff) => Promise<AdmissionDecision>;
};

export function useAdmissionWorker(): AdmissionWorkerHandle {
  // Track an alive flag so callbacks fired after unmount don't try to
  // resolve into stale state. (Resolvers themselves are still fine — the
  // map cleans up — but consumers that gate on `mounted` get a clean exit.)
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return useMemo<AdmissionWorkerHandle>(
    () => ({
      previewRule(rule, repo, prDiff = null) {
        return send<RulePreview>({
          id: nextId++,
          kind: 'preview',
          rule,
          repoSnap: toSnapshot(repo),
          prDiff,
        });
      },
      evaluate(rules, repo, diff) {
        return send<AdmissionDecision>({
          id: nextId++,
          kind: 'evaluate',
          rules,
          repoSnap: toSnapshot(repo),
          diff,
        });
      },
    }),
    [],
  );
}

// Optional: expose a way to terminate the worker (e.g. on app teardown in
// tests). Not wired into normal app lifecycle since the worker is cheap to
// keep around.
export function terminateAdmissionWorker(): void {
  if (workerSingleton) {
    workerSingleton.terminate();
    workerSingleton = null;
  }
  for (const [, p] of pending) p.reject(new Error('worker terminated'));
  pending.clear();
}
