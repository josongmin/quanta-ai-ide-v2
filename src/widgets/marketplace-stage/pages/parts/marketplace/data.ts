import {
  MessageSquare, GitBranch, BarChart3, Bell, Briefcase, Bot, Code2, Lock,
} from 'lucide-react';
import type { Category, Integration } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all',           label: 'All' },
  { id: 'chat',          label: 'Chat' },
  { id: 'ticketing',     label: 'Ticketing' },
  { id: 'observability', label: 'Observability' },
  { id: 'identity',      label: 'Identity' },
  { id: 'devtools',      label: 'Dev tools' },
  { id: 'analytics',     label: 'Analytics' },
  { id: 'ai',            label: 'AI' },
];

export const INTEGRATIONS: Integration[] = [
  { slug: 'slack',     name: 'Slack',      vendor: 'Slack',      category: 'chat',           blurb: 'Channel routing, threaded alerts, and slash commands.',     installs: 12480, rating: 4.8, verified: true, featured: true, icon: MessageSquare, tone: { from: 'var(--fg-accent)', to: 'var(--fg-link)' } },
  { slug: 'linear',    name: 'Linear',     vendor: 'Linear',     category: 'ticketing',      blurb: 'Sync admission failures and fix PRs to Linear issues.',     installs: 6420,  rating: 4.9, verified: true, featured: true, icon: Briefcase, tone: { from: 'var(--fg-link)', to: 'var(--intent-info-fg)' } },
  { slug: 'jira',      name: 'Jira',       vendor: 'Atlassian',  category: 'ticketing',      blurb: 'Bi-directional issue sync. Auto-create from agent runs.',  installs: 4810,  rating: 4.5, verified: true, icon: Briefcase, tone: { from: 'var(--intent-info-fg)', to: 'var(--fg-accent)' } },
  { slug: 'datadog',   name: 'Datadog',    vendor: 'Datadog',    category: 'observability',  blurb: 'Push metrics and admission events to a Datadog dashboard.', installs: 3210,  rating: 4.6, verified: true, icon: BarChart3, tone: { from: 'var(--intent-warn-fg)', to: 'var(--intent-danger-fg)' } },
  { slug: 'pagerduty', name: 'PagerDuty',  vendor: 'PagerDuty',  category: 'observability',  blurb: 'Page oncall on agent failures or admission outages.',       installs: 2840,  rating: 4.7, verified: true, icon: Bell, tone: { from: 'var(--intent-success-fg)', to: 'var(--fg-accent)' } },
  { slug: 'okta',      name: 'Okta',       vendor: 'Okta',       category: 'identity',       blurb: 'SAML SSO + SCIM provisioning. Enterprise plan.',            installs: 1820,  rating: 4.8, verified: true, icon: Lock, tone: { from: 'var(--intent-info-fg)', to: 'var(--fg-link)' } },
  { slug: 'github',    name: 'GitHub',     vendor: 'GitHub',     category: 'devtools',       blurb: 'Repo connection, status checks, PR comments.',              installs: 18900, rating: 4.9, verified: true, featured: true, icon: GitBranch, tone: { from: 'var(--fg-strong)', to: 'var(--fg-accent)' } },
  { slug: 'gitlab',    name: 'GitLab',     vendor: 'GitLab',     category: 'devtools',       blurb: 'MR pipelines and merge checks, self-hosted-compatible.',    installs: 2410,  rating: 4.4, verified: true, icon: GitBranch, tone: { from: 'var(--intent-warn-fg)', to: 'var(--intent-danger-fg)' } },
  { slug: 'amplitude', name: 'Amplitude',  vendor: 'Amplitude',  category: 'analytics',      blurb: 'Stream usage events for product analytics.',                installs: 1120,  rating: 4.3, verified: false, icon: BarChart3, tone: { from: 'var(--fg-link)', to: 'var(--fg-accent)' } },
  { slug: 'openai',    name: 'OpenAI',     vendor: 'OpenAI',     category: 'ai',             blurb: 'Bring-your-own model key for the autonomous fix agents.',   installs: 5320,  rating: 4.7, verified: true, icon: Bot, tone: { from: 'var(--intent-success-fg)', to: 'var(--intent-info-fg)' } },
  { slug: 'anthropic', name: 'Anthropic',  vendor: 'Anthropic',  category: 'ai',             blurb: 'Use Claude as the reasoning engine for review + fix.',      installs: 4210,  rating: 4.8, verified: true, featured: true, icon: Bot, tone: { from: 'var(--fg-accent)', to: 'var(--intent-warn-fg)' } },
  { slug: 'sentry',    name: 'Sentry',     vendor: 'Sentry',     category: 'observability',  blurb: 'Pull live errors into admission context.',                  installs: 2010,  rating: 4.5, verified: true, icon: Code2, tone: { from: 'var(--intent-danger-fg)', to: 'var(--fg-link)' } },
];
