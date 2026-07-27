import type { InviteRole } from '../../wizard';

// Role label/sub are resolved via t(`invite.roles.${role}Label` / `${role}Sub`).
export const ROLES: InviteRole[] = ['admin', 'member', 'reviewer', 'viewer'];

export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
