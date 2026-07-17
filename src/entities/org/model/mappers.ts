// Wire → app shape. better-auth's plugin types are wide (and its role field can
// be a comma-joined string for multi-role members), so we narrow defensively
// from `unknown` here — the ONE place that knows better-auth's org payload.

import {
  ORG_ROLES,
  type OrgDetail,
  type OrgInvitation,
  type OrgInvitationStatus,
  type OrgMember,
  type OrgRole,
  type OrgSummary,
  type OrgTeam,
} from './types';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function isoOf(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return '';
}

/** better-auth role → OrgRole. Multi-role members arrive comma-joined; we take
 *  the highest-privilege known role so the UI shows a single badge. */
export function toRole(v: unknown): OrgRole {
  const raw = str(v).split(',').map((r) => r.trim());
  for (const role of ORG_ROLES) {
    if (raw.includes(role)) return role;
  }
  return 'member';
}

function toStatus(v: unknown): OrgInvitationStatus {
  const s = str(v);
  return s === 'accepted' || s === 'canceled' || s === 'rejected' ? s : 'pending';
}

type RawUser = { id?: unknown; name?: unknown; email?: unknown; image?: unknown };
type RawMember = { id?: unknown; userId?: unknown; role?: unknown; createdAt?: unknown; user?: RawUser };

export function toMember(m: RawMember): OrgMember {
  const user = m.user ?? {};
  return {
    id: str(m.id),
    userId: str(m.userId, str(user.id)),
    name: str(user.name),
    email: str(user.email),
    role: toRole(m.role),
    image: typeof user.image === 'string' ? user.image : null,
    createdAt: isoOf(m.createdAt),
  };
}

type RawInvitation = { id?: unknown; email?: unknown; role?: unknown; status?: unknown; expiresAt?: unknown };

export function toInvitation(i: RawInvitation): OrgInvitation {
  return {
    id: str(i.id),
    email: str(i.email),
    role: toRole(i.role),
    status: toStatus(i.status),
    expiresAt: isoOf(i.expiresAt),
  };
}

type RawTeam = { id?: unknown; name?: unknown; createdAt?: unknown };

export function toTeam(t: RawTeam): OrgTeam {
  return { id: str(t.id), name: str(t.name), createdAt: isoOf(t.createdAt) };
}

type RawFullOrg = {
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  logo?: unknown;
  members?: unknown;
  invitations?: unknown;
  teams?: unknown;
};

export function toOrgSummary(o: RawFullOrg): OrgSummary {
  return {
    id: str(o.id),
    name: str(o.name),
    slug: str(o.slug),
    logo: typeof o.logo === 'string' ? o.logo : null,
  };
}

/** Map the whole `getFullOrganization` payload into the app bundle. Accepts
 *  `unknown` (better-auth's wide return) and narrows here. */
export function toOrgDetail(raw: unknown): OrgDetail {
  const o = (raw ?? {}) as RawFullOrg;
  const members = Array.isArray(o.members) ? o.members : [];
  const invitations = Array.isArray(o.invitations) ? o.invitations : [];
  const teams = Array.isArray(o.teams) ? o.teams : [];
  return {
    org: toOrgSummary(o),
    members: members.map((m) => toMember(m as RawMember)),
    // Only pending invitations are actionable; accepted/canceled are history.
    invitations: invitations
      .map((i) => toInvitation(i as RawInvitation))
      .filter((i) => i.status === 'pending'),
    teams: teams.map((t) => toTeam(t as RawTeam)),
  };
}
