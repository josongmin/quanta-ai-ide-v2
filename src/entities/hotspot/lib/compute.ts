import type { RepoData } from '@entities/repo';
import { makeRng } from '@shared/lib';
import type { HotspotEntry, HotspotSignals, SignalContribution, SignalKey } from '../model';
import { computeSignals } from './signals';

const SIGNAL_KEYS: SignalKey[] = [
  'change_pressure',
  'structural_friction',
  'health_deficit',
  'coupling_pressure',
  'criticality_proxy',
];

const cache = new WeakMap<RepoData, Map<number, HotspotEntry>>();

export function computeHotspots(repo: RepoData): Map<number, HotspotEntry> {
  const cached = cache.get(repo);
  if (cached) return cached;

  const rng = makeRng(repo.files.length * 9301 + 49297);
  const raw: { fileId: number; signals: HotspotSignals; score: number }[] = [];

  for (const file of repo.files) {
    const jitter = (rng() - 0.5) * 0.1;
    const signals = computeSignals(file, repo, jitter);
    const score = SIGNAL_KEYS.reduce((s, k) => s + signals[k], 0) / SIGNAL_KEYS.length;
    raw.push({ fileId: file.id, signals, score });
  }

  const sorted = [...raw].sort((a, b) => a.score - b.score);
  const rankByFile = new Map<number, number>();
  sorted.forEach((r, i) => { rankByFile.set(r.fileId, i); });

  const out = new Map<number, HotspotEntry>();
  const denom = Math.max(1, raw.length - 1);
  for (const r of raw) {
    const totalAbs = SIGNAL_KEYS.reduce((s, k) => s + r.signals[k], 0) || 1;
    const contributions: SignalContribution[] = SIGNAL_KEYS
      .map((k) => ({ key: k, value: r.signals[k], share: r.signals[k] / totalAbs }))
      .sort((a, b) => b.share - a.share);

    out.set(r.fileId, {
      fileId: r.fileId,
      score: r.score,
      percentile: (rankByFile.get(r.fileId) ?? 0) / denom,
      signals: r.signals,
      contributions,
    });
  }

  cache.set(repo, out);
  return out;
}
