import type { OpenPrConflict } from '../model';

// Mock open-PR overlap. Only the recommended candidate of seed-sarif-002
// overlaps — the other candidates touch a different file set. Honest
// "no conflict found" is a load-bearing signal too.
export const SAMPLE_CONFLICTS: Record<string, OpenPrConflict[]> = {
  'seed-sarif-002::cand-keyfilter': [
    {
      prNumber: 4421,
      title: 'shared/util: add deepClone variant for nested config',
      overlappingFiles: ['src/shared/util/deepMerge.ts'],
      author: '@hyejin',
    },
  ],
};
