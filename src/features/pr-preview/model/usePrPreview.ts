import { useCallback, useMemo } from 'react';
import { useOverlay } from '@features/apply-overlay';
import { useFilterStore } from '@features/filter-files';
import { simulateBranchDiff, type PRDiff } from '@entities/repo';

// Random seed in a comfortable display range (6-digit-ish). The simulator
// is deterministic per-seed, so this is the only place we sample entropy.
function pickSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

export type PrPreviewApi = {
  active: boolean;
  seed: number | null;
  start: () => void;
  stop: () => void;
  regenerate: () => void;
  diff: PRDiff | null;
};

/**
 * Coordinates the synthetic PR-diff overlay.
 *
 * The seed lives on `useOverlay` so other surfaces (the stage, the inspect
 * stack) can observe it; this hook just wraps the start/stop/regenerate
 * gestures and memoizes the derived `PRDiff` against `[repo, seed]`.
 */
export function usePrPreview(): PrPreviewApi {
  const { prSeed, setPrSeed } = useOverlay();
  const repo = useFilterStore((s) => s.repo);

  const active = prSeed !== null;

  const start = useCallback(() => {
    setPrSeed(pickSeed());
  }, [setPrSeed]);

  const stop = useCallback(() => {
    setPrSeed(null);
  }, [setPrSeed]);

  const regenerate = useCallback(() => {
    setPrSeed(pickSeed());
  }, [setPrSeed]);

  const diff = useMemo<PRDiff | null>(() => {
    if (prSeed === null) return null;
    return simulateBranchDiff(repo, prSeed);
  }, [repo, prSeed]);

  return { active, seed: prSeed, start, stop, regenerate, diff };
}
