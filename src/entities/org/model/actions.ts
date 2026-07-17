// Imperative org actions — the layer org-stage widgets call. Wraps
// `authClient.organization.*` and normalizes every result to the shared
// ActionResult (mirrors entities/session). Each mutation takes the
// organizationId from the loaded OrgDetail; on success the widget calls the
// useOrg `refetch` to re-read state.

import { authClient, normalizeResult, type ActionResult } from '@shared/auth';
import { messageForOrgError } from '../lib/orgErrors';
import { toOrgSummary } from './mappers';
import type { OrgRole, OrgSummary } from './types';

export type { ActionResult };

export type CreateOrgResult = { ok: true; org: OrgSummary } | { ok: false; error: string };

/** Create a new organization (onboarding bootstrap). Returns the created org so
 *  the caller can setActive / invite / checkout against its id. */
export async function createOrganization(input: {
  name: string;
  slug: string;
  logo?: string;
}): Promise<CreateOrgResult> {
  const res = await authClient.organization.create(input);
  if (res.error || !res.data) return { ok: false, error: messageForOrgError(res.error) };
  return { ok: true, org: toOrgSummary(res.data) };
}

function normalize(res: { error: unknown }): ActionResult {
  return normalizeResult(res, messageForOrgError);
}

// The org client is configured WITHOUT the server's custom role table — the
// owner/admin/member/billing/guest matrix is SSOT in accounts (auth/domain/
// roles.ts), not duplicated here. better-auth therefore types the *invitation*
// role to its built-ins (excludes billing/guest), so we assert at that boundary;
// the server validates the real set. (updateMemberRole's role is already wide.)
type InviteRole = Parameters<typeof authClient.organization.inviteMember>[0]['role'];

export async function inviteMember(input: {
  organizationId: string;
  email: string;
  role: OrgRole;
  teamId?: string;
  resend?: boolean;
}): Promise<ActionResult> {
  return normalize(
    await authClient.organization.inviteMember({ ...input, role: input.role as InviteRole }),
  );
}

export async function cancelInvitation(input: { invitationId: string }): Promise<ActionResult> {
  return normalize(await authClient.organization.cancelInvitation(input));
}

/** Accept an invitation (from the emailed accept link). Adds the signed-in user
 *  to the org and bumps its entitlement epoch (server afterAcceptInvitation). */
export async function acceptInvitation(input: { invitationId: string }): Promise<ActionResult> {
  return normalize(await authClient.organization.acceptInvitation(input));
}

/** Re-send an invite email — better-auth re-issues to the same email/role. */
export async function resendInvitation(input: {
  organizationId: string;
  email: string;
  role: OrgRole;
}): Promise<ActionResult> {
  return normalize(
    await authClient.organization.inviteMember({ ...input, role: input.role as InviteRole, resend: true }),
  );
}

export async function removeMember(input: {
  organizationId: string;
  memberIdOrEmail: string;
}): Promise<ActionResult> {
  return normalize(await authClient.organization.removeMember(input));
}

export async function updateMemberRole(input: {
  organizationId: string;
  memberId: string;
  role: OrgRole;
}): Promise<ActionResult> {
  return normalize(await authClient.organization.updateMemberRole(input));
}

export async function createTeam(input: {
  organizationId: string;
  name: string;
}): Promise<ActionResult> {
  return normalize(await authClient.organization.createTeam(input));
}

export async function removeTeam(input: {
  organizationId: string;
  teamId: string;
}): Promise<ActionResult> {
  return normalize(await authClient.organization.removeTeam(input));
}

export async function updateOrg(input: {
  organizationId: string;
  data: { name?: string; slug?: string; logo?: string };
}): Promise<ActionResult> {
  return normalize(await authClient.organization.update(input));
}

/** Permanently delete an org — fires the accounts server hook (Stripe cancel). */
export async function deleteOrg(input: { organizationId: string }): Promise<ActionResult> {
  return normalize(await authClient.organization.delete(input));
}

/** Make an org the session's active one (drives the JWT's activeOrganizationId
 *  claim). Used by onboarding + the org membership guard. */
export async function setActiveOrg(input: { organizationId: string }): Promise<ActionResult> {
  return normalize(await authClient.organization.setActive(input));
}
