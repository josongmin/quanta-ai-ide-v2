export type Scope =
  | 'org:read' | 'org:write' | 'members:read' | 'members:write'
  | 'admission:read' | 'admission:write' | 'agents:read' | 'agents:write'
  | 'webhooks:write' | 'audit:read';

// `labelKey` is an `org` namespace i18n key; resolved by the consumer.
export const SCOPE_OPTIONS: { id: Scope; labelKey: string; danger?: boolean }[] = [
  { id: 'org:read',         labelKey: 'api.scope.orgRead' },
  { id: 'org:write',        labelKey: 'api.scope.orgWrite', danger: true },
  { id: 'members:read',     labelKey: 'api.scope.membersRead' },
  { id: 'members:write',    labelKey: 'api.scope.membersWrite', danger: true },
  { id: 'admission:read',   labelKey: 'api.scope.admissionRead' },
  { id: 'admission:write',  labelKey: 'api.scope.admissionWrite', danger: true },
  { id: 'agents:read',      labelKey: 'api.scope.agentsRead' },
  { id: 'agents:write',     labelKey: 'api.scope.agentsWrite' },
  { id: 'webhooks:write',   labelKey: 'api.scope.webhooksWrite' },
  { id: 'audit:read',       labelKey: 'api.scope.auditRead' },
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
