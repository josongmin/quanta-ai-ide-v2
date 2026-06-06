import type { WizardData } from '../../wizard';

// Pretty provider name. Replaces the per-branch `if/else` ternaries with a
// single OCP-friendly Record so a new provider only needs one map entry.
export const PROVIDER_LABEL: Record<WizardData['workspace']['provider'], string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
};

export function providerLabel(p: WizardData['workspace']['provider']) {
  return PROVIDER_LABEL[p];
}

// Multi-stage indexing simulation. Each stage owns a slice of the 0–100 range.
export type IndexStage = { id: 'clone' | 'parse' | 'graph' | 'ready'; label: string; weight: number };

export const STAGES: IndexStage[] = [
  { id: 'clone', label: 'Clone & verify',      weight: 25 },
  { id: 'parse', label: 'Parse source files',  weight: 35 },
  { id: 'graph', label: 'Build symbol graph',  weight: 30 },
  { id: 'ready', label: 'Warm up dot field',   weight: 10 },
];
