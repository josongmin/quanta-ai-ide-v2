import type { InviteRole } from '../../wizard';

export const ROLE_META: Record<InviteRole, { label: string; sub: string }> = {
  admin:    { label: 'Admin',    sub: 'Manage org & billing' },
  member:   { label: 'Member',   sub: 'Default · code + reviews' },
  reviewer: { label: 'Reviewer', sub: 'Read + comment on PRs' },
  viewer:   { label: 'Viewer',   sub: 'Read-only access' },
};

export const ROLES: InviteRole[] = ['admin', 'member', 'reviewer', 'viewer'];

export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
