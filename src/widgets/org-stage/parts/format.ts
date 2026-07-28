// Shared presentational helpers for the real (backend-wired) org-stage pages.
// One home so MembersReal / InvitationsReal / TeamsReal don't each re-derive
// role labels, avatar initials, or date formatting.

import type { TFunction } from 'i18next';
import type { OrgRole } from '@entities/org';
import { formatDateShort } from '@shared/i18n';

/** Localized role label. `t` is the `org` namespace translator. */
export function roleLabel(t: TFunction<'org'>, role: OrgRole): string {
  return t(`common.role.${role}`);
}

/** Roles assignable via the UI (owner is set only through ownership transfer). */
export const ASSIGNABLE_ROLES: OrgRole[] = ['admin', 'member', 'billing', 'guest'];

export function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/** ISO → short app-locale date, or an em dash when absent/invalid. Thin re-export
 *  of the shared i18n formatter, kept under the org-stage presentational API so
 *  MembersReal / ServiceAccountsReal / WebhooksReal / TeamsReal call sites are
 *  unchanged. */
export const shortDate = formatDateShort;

/** Human "expires in N days" from an ISO expiry (past → "expired"). */
export function expiresLabel(t: TFunction<'org'>, iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return t('format.expired');
  const days = Math.ceil(ms / 86_400_000);
  if (days < 30) return t('format.day', { count: days });
  return shortDate(iso);
}
