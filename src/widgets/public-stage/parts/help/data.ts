// Seed data for the Help center page.

import {
  Rocket, ShieldCheck, Bot, Layers, CreditCard, AlertTriangle,
} from 'lucide-react';
import type { Article, Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'getting-started', title: 'Getting started', description: 'Install, connect a repo, ship your first admission rule.', icon: Rocket,        count: 18, from: 'var(--fg-accent)',         to: 'var(--fg-link)' },
  { id: 'admission',       title: 'Admission gates', description: 'Author rules, debug failures, propagate to workspaces.', icon: ShieldCheck,    count: 24, from: 'var(--intent-success-fg)',   to: 'var(--intent-info-fg)' },
  { id: 'agents',          title: 'Agents',          description: 'Configure, throttle, audit, and kill autonomous runs.',  icon: Bot,            count: 31, from: 'var(--fg-link)',             to: 'var(--fg-accent)' },
  { id: 'workspaces',      title: 'Workspaces',      description: 'Source connection, ownership, environments, secrets.',   icon: Layers,         count: 19, from: 'var(--intent-info-fg)',      to: 'var(--fg-accent)' },
  { id: 'billing',         title: 'Billing',         description: 'Plans, seats, invoices, tax IDs, contracts.',            icon: CreditCard,     count: 12, from: 'var(--intent-warn-fg)',      to: 'var(--fg-accent)' },
  { id: 'troubleshooting', title: 'Troubleshooting', description: '5xx, webhook delivery, SSO loops, agent timeouts.',      icon: AlertTriangle,  count: 22, from: 'var(--intent-danger-fg)',    to: 'var(--intent-warn-fg)' },
];

export const ARTICLES: Article[] = [
  // Getting started
  { id: 'a1',  title: 'Install the CLI in 60 seconds',                    category: 'getting-started', readMin: 2, views: 12842 },
  { id: 'a2',  title: 'Connect your first GitHub workspace',              category: 'getting-started', readMin: 4, views: 9821  },
  { id: 'a3',  title: 'Walkthrough: ship your first admission gate',     category: 'getting-started', readMin: 6, views: 7102  },
  // Admission
  { id: 'a4',  title: 'Anatomy of an admission rule',                     category: 'admission', readMin: 5,  views: 6291 },
  { id: 'a5',  title: 'Block vs. Warn vs. Off: choosing the right severity', category: 'admission', readMin: 3, views: 5402 },
  { id: 'a6',  title: 'Inheriting org defaults in workspaces',            category: 'admission', readMin: 4,  views: 4218 },
  // Agents
  { id: 'a7',  title: 'Why my agent stopped mid-run',                    category: 'agents', readMin: 3, views: 8132 },
  { id: 'a8',  title: 'Setting concurrency caps per agent',               category: 'agents', readMin: 4, views: 4980 },
  { id: 'a9',  title: 'Reading the agent activity log',                   category: 'agents', readMin: 5, views: 4322 },
  // Workspaces
  { id: 'a10', title: 'CODEOWNERS routing 101',                           category: 'workspaces', readMin: 4, views: 5481 },
  { id: 'a11', title: 'Promoting a deploy to production',                 category: 'workspaces', readMin: 3, views: 3902 },
  { id: 'a12', title: 'Secrets: rotating without downtime',               category: 'workspaces', readMin: 6, views: 3221 },
  // Billing
  { id: 'a13', title: 'Adding a tax ID to your invoices',                 category: 'billing', readMin: 2, views: 2841 },
  { id: 'a14', title: 'Switching plans without losing trial features',    category: 'billing', readMin: 3, views: 2102 },
  { id: 'a15', title: 'Understanding seat-based proration',               category: 'billing', readMin: 4, views: 1842 },
  // Troubleshooting
  { id: 'a16', title: 'SSO is in a loop after enabling SCIM',             category: 'troubleshooting', readMin: 5, views: 4391 },
  { id: 'a17', title: 'Webhook deliveries stuck at 502',                  category: 'troubleshooting', readMin: 4, views: 3821 },
  { id: 'a18', title: 'My fix-pipeline run timed out — why?',             category: 'troubleshooting', readMin: 4, views: 3211 },
];
