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
// Labels are resolved via t(`workspace.config.stage.${id}`).
export type IndexStage = { id: 'clone' | 'parse' | 'graph' | 'ready'; weight: number };

export const STAGES: IndexStage[] = [
  { id: 'clone', weight: 25 },
  { id: 'parse', weight: 35 },
  { id: 'graph', weight: 30 },
  { id: 'ready', weight: 10 },
];
