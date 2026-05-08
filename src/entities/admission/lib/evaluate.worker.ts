// Off-main-thread admission evaluation.
//
// Worker contract: this module is loaded as a `?worker` (or `new Worker(url, { type: 'module' })`)
// from `useAdmissionWorker`. We import the pure functions from `evaluate.ts`
// verbatim — no logic lives in this file, only the message dispatch.
// The main thread sends a `Req` keyed by `id`; we reply with a matching `Res`
// (success or error) on the same `id`. The repo passed across the boundary is
// a minimal `RepoSnapshot` (just `files`) since that's all `evaluate.ts` reads.

import type { RepoData, PRDiff } from '@entities/repo';
import type { AdmissionRule, RulePreview, AdmissionDecision } from '../model';
import { previewRule, evaluateAdmission } from './evaluate';

// Minimal repo shape consumed by evaluate.ts. Keeping this lean dramatically
// cuts structuredClone cost (the full RepoData carries folders, foldersByPath
// Map, ranges, owners — none of which evaluate.ts touches).
export type RepoSnapshot = {
  files: RepoData['files'];
};

export type AdmissionWorkerReq =
  | { id: number; kind: 'preview'; rule: AdmissionRule; repoSnap: RepoSnapshot; prDiff: PRDiff | null }
  | { id: number; kind: 'evaluate'; rules: AdmissionRule[]; repoSnap: RepoSnapshot; diff: PRDiff };

export type AdmissionWorkerRes =
  | { id: number; ok: true; kind: 'preview'; result: RulePreview }
  | { id: number; ok: true; kind: 'evaluate'; result: AdmissionDecision }
  | { id: number; ok: false; error: string };

// `self` is the DedicatedWorkerGlobalScope here; we cast to keep TS happy
// without pulling in the lib.webworker.d.ts target-wide.
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<AdmissionWorkerReq>) => void) | null;
  postMessage: (msg: AdmissionWorkerRes) => void;
};

ctx.onmessage = (e) => {
  const req = e.data;
  try {
    if (req.kind === 'preview') {
      // Cast snapshot back to RepoData — evaluate.ts only reads `files`.
      const repo = req.repoSnap as unknown as RepoData;
      const result = previewRule(req.rule, repo, req.prDiff);
      ctx.postMessage({ id: req.id, ok: true, kind: 'preview', result });
    } else if (req.kind === 'evaluate') {
      const repo = req.repoSnap as unknown as RepoData;
      const result = evaluateAdmission(req.rules, repo, req.diff);
      ctx.postMessage({ id: req.id, ok: true, kind: 'evaluate', result });
    } else {
      ctx.postMessage({ id: (req as { id: number }).id, ok: false, error: 'unknown request kind' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ id: req.id, ok: false, error: message });
  }
};
