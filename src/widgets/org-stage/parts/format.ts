// Shared presentational helpers for the real (backend-wired) org-stage pages.
// One home so MembersReal / InvitationsReal / TeamsReal don't each re-derive
// role labels, avatar initials, or date formatting.

import type { OrgRole } from '@entities/org';

export const ROLE_LABEL: Record<OrgRole, string> = {
  owner: 'Owner', admin: 'Admin', member: 'Member', billing: 'Billing', guest: 'Guest',
};

/** Roles assignable via the UI (owner is set only through ownership transfer). */
export const ASSIGNABLE_ROLES: OrgRole[] = ['admin', 'member', 'billing', 'guest'];

export function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/** ISO → short local date, or an em dash when absent/invalid. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Human "expires in N days" from an ISO expiry (past → "expired"). */
export function expiresLabel(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const days = Math.ceil(ms / 86_400_000);
  if (days === 1) return '1 day';
  if (days < 30) return `${days.toString()} days`;
  return shortDate(iso);
}
