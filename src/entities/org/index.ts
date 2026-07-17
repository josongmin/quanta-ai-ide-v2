// Public surface for the org entity — org-stage widgets import from here only.
export { useOrg } from './model/useOrg';
export { useActiveOrgSlug } from './model/useMyOrgs';
export {
  createOrganization,
  inviteMember,
  cancelInvitation,
  resendInvitation,
  acceptInvitation,
  removeMember,
  updateMemberRole,
  createTeam,
  removeTeam,
  updateOrg,
  deleteOrg,
  setActiveOrg,
  type ActionResult,
  type CreateOrgResult,
} from './model/actions';
export {
  type OrgRole,
  type OrgSummary,
  type OrgMember,
  type OrgInvitation,
  type OrgInvitationStatus,
  type OrgTeam,
  type OrgDetail,
} from './model/types';
