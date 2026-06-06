// Seed data for the Pricing page.

import {
  Sparkles, Zap, ShieldCheck, Users, Bot, Database, Globe, BarChart3,
} from 'lucide-react';
import type { Feature, Plan } from './types';

export const PLANS: Plan[] = [
  {
    id: 'free', name: 'Free', tagline: 'For individuals exploring the platform',
    monthly: 0, annual: 0, unit: '/ month',
    cta: 'Start free',
    features: [
      'Up to 5 members',
      '1 connected workspace',
      '500 agent runs / month',
      'Basic admission gates',
      'Community support',
    ],
  },
  {
    id: 'team', name: 'Team', tagline: 'For teams shipping every week',
    monthly: 29, annual: 24, unit: '/ seat / month',
    cta: 'Start 14-day trial', ctaPrimary: true, featured: true,
    features: [
      'Unlimited members',
      'Unlimited workspaces',
      'Unlimited agent runs',
      'Custom admission rules',
      'Slack / Linear / Jira integrations',
      'Email + chat support',
      'Audit log (30 days)',
    ],
  },
  {
    id: 'business', name: 'Business', tagline: 'For orgs with security & compliance',
    monthly: 79, annual: 64, unit: '/ seat / month',
    cta: 'Start 14-day trial',
    features: [
      'Everything in Team',
      'SAML SSO + SCIM provisioning',
      'Audit log (1 year)',
      'IP allowlist + session policy',
      'Custom roles (RBAC)',
      'Priority support · 4h SLA',
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', tagline: 'For regulated industries at scale',
    monthly: null, annual: null, unit: 'Annual contract',
    cta: 'Talk to sales',
    features: [
      'Everything in Business',
      'Data residency (US / EU / APAC)',
      'Dedicated infrastructure option',
      'Per-data-class retention policy',
      'Named CSM + onboarding',
      '99.99% uptime SLA',
      'Custom MSA / DPA / BAA',
    ],
  },
];

export const MATRIX: { group: string; rows: Feature[] }[] = [
  {
    group: 'Core',
    rows: [
      { id: 'members',    label: 'Members',                icon: Users,    cells: ['5', '∞', '∞', '∞'] },
      { id: 'workspaces', label: 'Workspaces',             icon: Globe,    cells: ['1', '∞', '∞', '∞'] },
      { id: 'agentRuns',  label: 'Agent runs / month',     icon: Bot,      cells: ['500', '∞', '∞', '∞'] },
      { id: 'admission',  label: 'Custom admission rules', icon: ShieldCheck, cells: [false, true, true, true] },
    ],
  },
  {
    group: 'Security & compliance',
    rows: [
      { id: 'sso',        label: 'SAML SSO',               icon: ShieldCheck, cells: [false, false, true, true] },
      { id: 'scim',       label: 'SCIM provisioning',      icon: Users,    cells: [false, false, true, true] },
      { id: 'audit',      label: 'Audit log retention',    icon: BarChart3,cells: ['—', '30 days', '1 year', 'Custom'] },
      { id: 'rbac',       label: 'Custom roles (RBAC)',    icon: ShieldCheck, cells: [false, false, true, true] },
      { id: 'residency',  label: 'Data residency',         icon: Globe,    cells: [false, false, false, true] },
    ],
  },
  {
    group: 'Support',
    rows: [
      { id: 'sup',        label: 'Support channels',       icon: Sparkles, cells: ['Community', 'Email + chat', 'Priority · 4h', 'Named CSM'] },
      { id: 'sla',        label: 'Uptime SLA',             icon: Zap,      cells: ['—', '99.9%', '99.95%', '99.99%'] },
      { id: 'onboarding', label: 'Onboarding',             icon: Database, cells: ['Self-serve', 'Self-serve', 'Guided', 'White-glove'] },
    ],
  },
];

export const FAQ: { q: string; a: string }[] = [
  { q: 'How does seat-based pricing work?', a: 'You\'re billed for active members each month. Invited-but-unconfirmed seats are free. Deactivating a member immediately drops them from the next invoice — no proration tricks.' },
  { q: 'What counts as an "agent run"?', a: 'A single autonomous action triggered by an admission gate, review request, or fix-pipeline kickoff. Failed runs that retry automatically don\'t multi-count.' },
  { q: 'Can I switch plans mid-cycle?', a: 'Yes. Upgrades take effect immediately and we prorate. Downgrades take effect at the next billing cycle so you keep features you\'ve paid for.' },
  { q: 'Do you offer discounts for non-profits or open source?', a: 'Yes — 50% off Team and Business for verified non-profits, and Free with no member cap for OSI-approved open source projects. Email hello@acme.com.' },
  { q: 'How are agent costs calculated for Enterprise?', a: 'Either bundled into a flat per-seat rate or metered per million tokens — your AE will quote both so you can compare against your usage profile.' },
  { q: 'Is there a free trial for paid plans?', a: 'Team and Business include a 14-day trial of all features. No card required to start, and the trial doesn\'t convert silently — you\'ll get a 3-day notice email before charging.' },
];

export const CUSTOMERS = [
  { label: 'Linear',      mark: 'LN' },
  { label: 'Vercel',      mark: 'VC' },
  { label: 'Stripe',      mark: 'ST' },
  { label: 'Notion',      mark: 'NT' },
  { label: 'Figma',       mark: 'FG' },
  { label: 'Anthropic',   mark: 'AN' },
  { label: 'Datadog',     mark: 'DD' },
  { label: 'Cloudflare',  mark: 'CF' },
  { label: 'PlanetScale', mark: 'PS' },
  { label: 'Sentry',      mark: 'SN' },
];
