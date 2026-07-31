// Single HTTP client — the one gateway every real network call goes through.
//
// Design for a clean mock→real swap:
//   • Returns a tagged `ApiResult<T>` (never throws) so call sites branch on
//     `ok` exactly like the existing `GenerateError` result shape.
//   • In mock mode every call returns `{ ok:false, error:{ kind:'not-wired' }}`
//     — features are expected to use their in-app generator instead. Once
//     VITE_API_MODE=real, the same call sites hit the backend unchanged.
//   • Auth-token attach and 401 handling are registered seams (setAuthToken-
//     Getter / setUnauthorizedHandler) so the auth phase plugs in without
//     touching this file.

import type { ZodType } from 'zod';
import { env } from '@shared/config/env';

export type ApiError = {
  kind: 'network' | 'http' | 'parse' | 'unauthorized' | 'not-wired';
  status?: number;
  message: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/** Map an ApiError to a user-facing string. `resource` names what was being
 *  read for the 403 case ("the audit log", "billing"). One home so every
 *  accountsApi/api caller renders consistent copy. */
export function apiErrorMessage(e: ApiError, resource = 'this'): string {
  if (e.kind === 'unauthorized') return 'Your session expired. Please sign in again.';
  if (e.kind === 'http' && e.status === 403) return `You don't have permission to view ${resource}.`;
  if (e.kind === 'http' && e.status === 429) return 'Too many requests. Please wait and try again.';
  if (e.kind === 'not-wired') return 'Not available in demo mode.';
  return e.message || 'Something went wrong.';
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

// ── Registered seams (auth phase wires these) ────────────────────────────
let authTokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => { /* no-op until auth is wired */ };

/** Auth phase: return the current access token (attached as Bearer). */
export function setAuthTokenGetter(fn: () => string | null): void {
  authTokenGetter = fn;
}
/** Auth phase: called on any 401 (refresh token / redirect to login). */
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function request<T>(method: Method, path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> {
  if (!env.useRealApi) {
    return {
      ok: false,
      error: { kind: 'not-wired', message: `API in mock mode — ${method} ${path} should use its in-app generator` },
    };
  }

  try {
    const token = authTokenGetter();
    const res = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401) {
      onUnauthorized();
      return { ok: false, error: { kind: 'unauthorized', status: 401, message: 'Unauthorized' } };
    }
    if (!res.ok) {
      return { ok: false, error: { kind: 'http', status: res.status, message: `HTTP ${res.status.toString()}` } };
    }

    // A 204 / empty body (the REST convention for a successful DELETE/PUT with
    // no content) is a SUCCESS, not a parse error — read text and only parse
    // when non-empty.
    const text = await res.text();
    if (text === '') return { ok: true, data: undefined as T };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: { kind: 'parse', message: 'Invalid JSON response' } };
    }
    // Runtime-validate the shape at the trust boundary when a schema is supplied
    // (a compromised/misversioned backend can't leak a wrong shape into the UI).
    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) return { ok: false, error: { kind: 'parse', message: 'Response failed schema validation' } };
      return { ok: true, data: result.data };
    }
    return { ok: true, data: parsed as T };
  } catch (e) {
    return { ok: false, error: { kind: 'network', message: e instanceof Error ? e.message : String(e) } };
  }
}

export const api = {
  get: <T>(path: string, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('GET', path, undefined, schema),
  post: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('POST', path, body, schema),
  patch: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('PATCH', path, body, schema),
  put: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('PUT', path, body, schema),
  del: <T>(path: string, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('DELETE', path, undefined, schema),
};
