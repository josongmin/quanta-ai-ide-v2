// Demo IdP directory. Maps email/org domains to a configured IdP so the
// SSO and Sign-up screens can show "we know about your org" hints without
// hitting a real backend. Add to the table to expand the demo set.

export type IdPProvider = 'okta' | 'azure-ad' | 'google-workspace' | 'jumpcloud' | 'auth0' | 'pingfederate';

export type IdPRecord = {
  domain: string;          // e.g. "acme.com"
  org: string;             // display name
  provider: IdPProvider;
  protocol: 'SAML 2.0' | 'OIDC';
  enforced: boolean;       // when true, password login is blocked for this domain
  metadataUrl?: string;
};

const REGISTRY: IdPRecord[] = [
  { domain: 'acme.com',       org: 'ACME, Inc.',      provider: 'okta',             protocol: 'SAML 2.0', enforced: true,  metadataUrl: 'https://acme.okta.com/app/exk0xxx/sso/saml/metadata' },
  { domain: 'globex.io',      org: 'Globex Industries',provider: 'azure-ad',        protocol: 'SAML 2.0', enforced: true,  metadataUrl: 'https://login.microsoftonline.com/.../federationmetadata' },
  { domain: 'initech.com',    org: 'Initech',         provider: 'google-workspace', protocol: 'OIDC',     enforced: false },
  { domain: 'massive-dynamic.io', org: 'Massive Dynamic', provider: 'jumpcloud',    protocol: 'SAML 2.0', enforced: true },
  { domain: 'pied-piper.com', org: 'Pied Piper',      provider: 'auth0',            protocol: 'OIDC',     enforced: false },
  { domain: 'hooli.xyz',      org: 'Hooli',           provider: 'pingfederate',     protocol: 'SAML 2.0', enforced: true },
];

export function lookupIdP(input: string): IdPRecord | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  // Accept "alice@acme.com" or "acme.com".
  const domain = trimmed.includes('@') ? trimmed.split('@')[1] : trimmed;
  if (!domain) return null;
  return REGISTRY.find((r) => r.domain === domain) ?? null;
}

export const PROVIDER_LABEL: Record<IdPProvider, string> = {
  'okta':              'Okta',
  'azure-ad':          'Microsoft Entra (Azure AD)',
  'google-workspace':  'Google Workspace',
  'jumpcloud':         'JumpCloud',
  'auth0':             'Auth0',
  'pingfederate':      'PingFederate',
};
