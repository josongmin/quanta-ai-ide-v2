// Cookie-authed gateway to the accounts backend's product endpoints (`/v1/*`).
//
// Why a second client alongside shared/api/client.ts:
//   • accounts `/v1/*` (billing, entitlements, audit) is guarded by better-auth
//     SESSION cookies (lib/guard.ts → getSession(headers)), NOT a Bearer token.
//     So requests must carry `credentials:'include'` against `accountsUrl` —
//     exactly like the better-auth client, and unlike shared/api (which is the
//     Bearer-JWT gateway reserved for the future product/intel API).
//   • Returns the same tagged `ApiResult<T>` so call sites branch identically.
//
// Gated on `env.useRealAuth`: in the standalone demo (mock auth) these endpoints
// don't exist, so every call short-circuits to `not-wired` and the caller falls
// back to its in-app fixture.

import type { ZodType } from 'zod';
import { env } from '@shared/config/env';
import type { ApiResult } from '@shared/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> {
  if (!env.useRealAuth) {
    return {
      ok: false,
      error: { kind: 'not-wired', message: `accounts in mock mode — ${method} ${path}` },
    };
  }

  try {
    const res = await fetch(`${env.accountsUrl}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401) {
      return { ok: false, error: { kind: 'unauthorized', status: 401, message: 'Unauthorized' } };
    }
    if (!res.ok) {
      // 백엔드 에러 body({ kind, message })의 message를 살려 실제 사유를 노출한다 — 안 그러면
      // "domain is already claimed" 같은 문구가 전부 "HTTP 409"로 뭉개진다. body가 JSON이
      // 아니거나 message가 없으면 상태코드로 폴백.
      let message = `HTTP ${res.status.toString()}`;
      try {
        const errBody = (await res.json()) as { message?: unknown };
        if (typeof errBody?.message === 'string' && errBody.message.trim() !== '') message = errBody.message;
      } catch {
        /* non-JSON / empty body — keep status-code fallback */
      }
      return { ok: false, error: { kind: 'http', status: res.status, message } };
    }

    // Empty body (204 / no-content success) is not a parse error.
    const text = await res.text();
    if (text === '') return { ok: true, data: undefined as T };
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: { kind: 'parse', message: 'Invalid JSON response' } };
    }
    // Runtime-validate the shape at the trust boundary when a schema is supplied.
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

/** Cookie-authed calls to accounts `/v1/*`. Mirrors `api` (shared/api) but for
 *  the session-cookie backend rather than the Bearer product API. */
export const accountsApi = {
  get: <T>(path: string, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('GET', path, undefined, schema),
  post: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('POST', path, body, schema),
  patch: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('PATCH', path, body, schema),
  put: <T>(path: string, body?: unknown, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('PUT', path, body, schema),
  del: <T>(path: string, schema?: ZodType<T>): Promise<ApiResult<T>> => request<T>('DELETE', path, undefined, schema),
};
