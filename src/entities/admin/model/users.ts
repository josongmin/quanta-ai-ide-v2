// Platform super-admin: user directory + moderation over accounts /v1/admin/*
// (cookie-authed, requireSuperAdmin server-side). Reuses the {ok,data}|{ok,error}
// idiom. NOTE: shapes mirror @p0/contracts admin; replace with codegen when wired.
import { z } from 'zod';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage, type ApiError } from '@shared/api';

const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.string().nullable(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

const AdminUserPageSchema = z.object({
  users: z.array(AdminUserSchema),
  nextCursor: z.string().nullable(),
});
export type AdminUserPage = z.infer<typeof AdminUserPageSchema>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type ActionResult = { ok: true } | { ok: false; error: string };

export async function listUsers(opts: { search?: string; cursor?: string | null } = {}): Promise<Result<AdminUserPage>> {
  const params = new URLSearchParams();
  if (opts.search?.trim()) params.set('search', opts.search.trim());
  if (opts.cursor) params.set('cursor', opts.cursor);
  const qs = params.toString();
  const res = await accountsApi.get<AdminUserPage>(`/v1/admin/users${qs ? `?${qs}` : ''}`, AdminUserPageSchema);
  return res.ok
    ? { ok: true, data: { users: Array.isArray(res.data.users) ? res.data.users : [], nextCursor: res.data.nextCursor ?? null } }
    : { ok: false, error: apiErrorMessage(res.error, 'users') };
}

// 400 = moderation 거부(자기 자신/다른 admin) → 친절한 메시지.
function moderationError(res: { error: ApiError }, fallback: string): string {
  if (res.error.kind === 'http' && res.error.status === 400) return "You can't do this to yourself or another admin.";
  return apiErrorMessage(res.error, fallback);
}

export async function banUser(id: string, reason: string | null): Promise<ActionResult> {
  const res = await accountsApi.post(`/v1/admin/users/${encodeURIComponent(id)}/ban`, { reason });
  return res.ok ? { ok: true } : { ok: false, error: moderationError(res, 'ban') };
}

export async function unbanUser(id: string): Promise<ActionResult> {
  const res = await accountsApi.post(`/v1/admin/users/${encodeURIComponent(id)}/unban`);
  if (res.ok) return { ok: true };
  if (res.error.kind === 'http' && res.error.status === 404) return { ok: true }; // already gone
  return { ok: false, error: apiErrorMessage(res.error, 'unban') };
}

export async function impersonateUser(id: string): Promise<ActionResult> {
  const res = await accountsApi.post(`/v1/admin/users/${encodeURIComponent(id)}/impersonate`);
  return res.ok ? { ok: true } : { ok: false, error: moderationError(res, 'impersonate') };
}
