export type Scope =
  | 'org:read' | 'org:write' | 'members:read' | 'members:write'
  | 'admission:read' | 'admission:write' | 'agents:read' | 'agents:write'
  | 'webhooks:write' | 'audit:read';

export const SCOPE_OPTIONS: { id: Scope; label: string; danger?: boolean }[] = [
  { id: 'org:read',         label: 'Read org settings' },
  { id: 'org:write',        label: 'Manage org settings', danger: true },
  { id: 'members:read',     label: 'Read members' },
  { id: 'members:write',    label: 'Invite/remove members', danger: true },
  { id: 'admission:read',   label: 'Read admission rules' },
  { id: 'admission:write',  label: 'Author admission rules', danger: true },
  { id: 'agents:read',      label: 'Read agents' },
  { id: 'agents:write',     label: 'Trigger agents' },
  { id: 'webhooks:write',   label: 'Manage webhooks' },
  { id: 'audit:read',       label: 'Read audit log' },
];

export type Pat = {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string;
};

export type OAuthApp = {
  id: string;
  name: string;
  clientId: string;
  redirectUri: string;
  scopes: Scope[];
  installs: number;
  createdAt: string;
  status: 'published' | 'draft';
};
