// Per-user AI settings over accounts /v1/me/ai-settings (cookie-authed). Mirrors the
// accounts `aiPrefs` contract (packages/contracts/ai-prefs.ts). Personal preferences only
// (org-policy overrides are a separate concern).

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type AiSurface = 'coding' | 'review' | 'fix';

export type AiPrefs = {
  models: Record<AiSurface, string>;
  inlineSuggestions: boolean;
  suggestionVerbosity: 'brief' | 'normal' | 'verbose';
  autoCommitMessages: boolean;
  autoReviewSummaries: boolean;
  autoEvidenceLinks: boolean;
  contextDepth: 'file' | 'module' | 'workspace';
  trainingOptOut: boolean;
  redactSecrets: boolean;
  costCapPerDay: number;
  spikeAlertAt: number;
  fallbackToFastModel: boolean;
};

export async function getAiPrefs(): Promise<Result<AiPrefs>> {
  const res = await accountsApi.get<AiPrefs>('/v1/me/ai-settings');
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'AI settings') };
}

export async function saveAiPrefs(prefs: AiPrefs): Promise<Result<AiPrefs>> {
  const res = await accountsApi.put<AiPrefs>('/v1/me/ai-settings', prefs);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'AI settings') };
}
