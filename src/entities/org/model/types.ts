// Normalized organization shapes — the app-facing contract over better-auth's
// organization plugin. Widgets read THESE (never raw better-auth types), so the
// UI stays stable and only the mappers (model/mappers.ts) know the wire shape.
//
// Deliberately narrower than the demo's mock `Member`: better-auth has no
// per-member `lastActive`, `team` label, `twoFA` flag, or `deactivated` status
// (removal is the only offboarding). The real UI reflects what the backend
// actually knows — see the org-stage pages for the graceful degradation.

/** RBAC roles — must match the accounts server matrix (auth/domain/roles.ts). */
export type OrgRole = 'owner' | 'admin' | 'member' | 'billing' | 'guest';

export const ORG_ROLES: readonly OrgRole[] = ['owner', 'admin', 'member', 'billing', 'guest'];

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
};

export type OrgMember = {
  /** Membership id (used for role updates / removal). */
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  image: string | null;
  /** ISO joined-at. */
  createdAt: string;
};

export type OrgInvitationStatus = 'pending' | 'accepted' | 'canceled' | 'rejected';

export type OrgInvitation = {
  id: string;
  email: string;
  role: OrgRole;
  status: OrgInvitationStatus;
  /** ISO expiry. */
  expiresAt: string;
};

export type OrgTeam = {
  id: string;
  name: string;
  createdAt: string;
};

/** Full org bundle from a single `getFullOrganization` call. */
export type OrgDetail = {
  org: OrgSummary;
  members: OrgMember[];
  invitations: OrgInvitation[];
  teams: OrgTeam[];
};
