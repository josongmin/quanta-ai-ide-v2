import {
  ShieldCheck, Lock, Globe, KeyRound, Activity, Eye, Cpu, Server, ScrollText,
} from 'lucide-react';

export const CERTS = [
  { id: 'soc2',  label: 'SOC 2 Type II', sub: 'Audited annually', tone: 'var(--intent-success-fg)' },
  { id: 'iso',   label: 'ISO 27001',     sub: 'Certified 2024',   tone: 'var(--intent-info-fg)' },
  { id: 'iso2',  label: 'ISO 27701',     sub: 'Privacy extension',tone: 'var(--fg-accent)' },
  { id: 'gdpr',  label: 'GDPR',          sub: 'EU + UK compliant',tone: 'var(--fg-link)' },
  { id: 'ccpa',  label: 'CCPA',          sub: 'California',       tone: 'var(--intent-warn-fg)' },
  { id: 'hipaa', label: 'HIPAA BAA',     sub: 'On request',       tone: 'var(--intent-danger-fg)' },
];

export const POLICIES = [
  { icon: ShieldCheck, title: 'Data encryption',          blurb: 'AES-256 at rest, TLS 1.3 in transit. Per-org KMS keys on Business+.',  tag: 'Always-on' },
  { icon: KeyRound,    title: 'Authentication',           blurb: 'WebAuthn, TOTP, SSO via SAML/OIDC. SCIM provisioning on Enterprise.',  tag: 'Configurable' },
  { icon: Eye,         title: 'Access controls',          blurb: 'Role-based access, scoped tokens, fine-grained audit trail.',         tag: 'Always-on' },
  { icon: Globe,       title: 'Data residency',           blurb: 'US, EU, AP regions. Pick per workspace. Data never leaves your region.', tag: 'Enterprise' },
  { icon: Activity,    title: 'Monitoring & response',    blurb: '24/7 SOC. Median IR engagement under 12 minutes.',                    tag: 'Always-on' },
  { icon: ScrollText,  title: 'Audit log',                blurb: 'Every action, exportable to SIEM. 1y retention; configurable.',       tag: 'Always-on' },
];

export const ARCHITECTURE_LAYERS = [
  { icon: Globe,  label: 'Edge',        sub: 'CDN · WAF · DDoS' },
  { icon: Server, label: 'API tier',    sub: 'mTLS · token scoping' },
  { icon: Cpu,    label: 'Agent sandbox',sub: 'Ephemeral · per-job VM' },
  { icon: Lock,   label: 'Secrets',     sub: 'KMS · per-org keys' },
  { icon: Activity, label: 'Audit',     sub: 'Append-only · SIEM' },
  { icon: ShieldCheck, label: 'Compliance', sub: 'SOC2 · ISO27001' },
];

export const SUBPROCESSORS = [
  { name: 'Amazon Web Services', purpose: 'Hosting · compute · storage', region: 'us-east, eu-west, ap-ne' },
  { name: 'Stripe',              purpose: 'Payment processing',           region: 'us-east' },
  { name: 'OpenAI',              purpose: 'LLM inference (opt-in)',       region: 'us-east' },
  { name: 'Sentry',              purpose: 'Error monitoring',             region: 'us-west' },
];

export const DOCS = [
  { id: 'whitepaper',  title: 'Security whitepaper',      sub: 'Architecture, encryption, IR' },
  { id: 'soc2-report', title: 'SOC 2 Type II report',    sub: 'NDA required' },
  { id: 'pentest',     title: 'Pentest summary',          sub: 'Latest: 2026-Q1' },
  { id: 'dpa',         title: 'Data processing addendum', sub: 'Pre-signed PDF' },
  { id: 'subs',        title: 'Subprocessors list',       sub: 'Notification SLA: 30 days' },
];
