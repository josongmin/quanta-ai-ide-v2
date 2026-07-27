// Connected identity providers (GitHub/Google) over the better-auth core account
// endpoints (/list-accounts, /unlink-account) — same client-inference mechanism as
// listSessions in account.ts. Only identity providers are surfaced; third-party
// integrations (Slack/Jira/…) have no backend and are intentionally not listed.

import {
  authClient, normalizeResult, normalizeData,
  type ActionResult, type ActionData,
} from '@shared/auth';

export type { ActionResult };

export type LinkedAccount = {
  id: string;
  providerId: string; // 'github' | 'google' (identity); 'credential' = email/password, excluded
  accountId: string;
  scopes: string[];
  createdAt: string;
};

// Identity providers we surface. 'credential' (email/password) is not a connected app.
const IDENTITY_PROVIDERS = new Set(['github', 'google']);

function isoOf(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : '';
}

export async function listLinkedAccounts(): Promise<ActionData<LinkedAccount[]>> {
  const res = await authClient.listAccounts();
  const norm = normalizeData(res);
  if (!norm.ok) return norm;
  const rows = (Array.isArray(norm.data) ? norm.data : [])
    .map((a): LinkedAccount => {
      const row = a as {
        id?: unknown; providerId?: unknown; accountId?: unknown;
        scopes?: unknown; createdAt?: unknown;
      };
      return {
        id: typeof row.id === 'string' ? row.id : '',
        providerId: typeof row.providerId === 'string' ? row.providerId : '',
        accountId: typeof row.accountId === 'string' ? row.accountId : '',
        scopes: Array.isArray(row.scopes) ? row.scopes.filter((s): s is string => typeof s === 'string') : [],
        createdAt: isoOf(row.createdAt),
      };
    })
    .filter((a) => IDENTITY_PROVIDERS.has(a.providerId));
  return { ok: true, data: rows };
}

/** Unlink a connected provider. accountId disambiguates when 2+ of the same provider. */
export async function unlinkAccount(input: { providerId: string; accountId?: string }): Promise<ActionResult> {
  return normalizeResult(await authClient.unlinkAccount(input));
}
