// Per-user AI settings over accounts /v1/me/ai-settings (cookie-authed). Mirrors the
// accounts `aiPrefs` contract (packages/contracts/ai-prefs.ts). Personal preferences only
// (org-policy overrides are a separate concern).

import { z } from 'zod';

import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const AiSurfaceSchema = z.enum(['coding', 'review', 'fix']);

export type AiSurface = z.infer<typeof AiSurfaceSchema>;

const AiPrefsSchema = z.object({
  models: z.record(AiSurfaceSchema, z.string()),
  inlineSuggestions: z.boolean(),
  suggestionVerbosity: z.enum(['brief', 'normal', 'verbose']),
  autoCommitMessages: z.boolean(),
  autoReviewSummaries: z.boolean(),
  autoEvidenceLinks: z.boolean(),
  contextDepth: z.enum(['file', 'module', 'workspace']),
  trainingOptOut: z.boolean(),
  redactSecrets: z.boolean(),
  costCapPerDay: z.number(),
  spikeAlertAt: z.number(),
  fallbackToFastModel: z.boolean(),
});

export type AiPrefs = z.infer<typeof AiPrefsSchema>;

export async function getAiPrefs(): Promise<Result<AiPrefs>> {
  const res = await accountsApi.get<AiPrefs>('/v1/me/ai-settings', AiPrefsSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'AI settings') };
}

export async function saveAiPrefs(prefs: AiPrefs): Promise<Result<AiPrefs>> {
  const res = await accountsApi.put<AiPrefs>('/v1/me/ai-settings', prefs, AiPrefsSchema);
  return res.ok ? { ok: true, data: res.data } : { ok: false, error: apiErrorMessage(res.error, 'AI settings') };
}
