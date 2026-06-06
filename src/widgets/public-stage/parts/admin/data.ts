// Seed data for the Super-admin page.

import type { AdminUser, Flag, Job, Org } from './types';

export const ORGS: Org[] = [
  { id: 'o1',  name: 'ACME, Inc.',       slug: 'acme',         plan: 'enterprise', members: 412, spend: 18420, signedUp: '2023-04-12' },
  { id: 'o2',  name: 'Northwind Labs',   slug: 'northwind',    plan: 'business',   members: 86,  spend: 4280,  signedUp: '2024-01-08' },
  { id: 'o3',  name: 'Globex Corp',      slug: 'globex',       plan: 'enterprise', members: 248, spend: 12990, signedUp: '2023-09-21' },
  { id: 'o4',  name: 'Initech',          slug: 'initech',      plan: 'team',       members: 22,  spend: 612,   signedUp: '2025-02-14' },
  { id: 'o5',  name: 'Soylent',          slug: 'soylent',      plan: 'business',   members: 54,  spend: 2150,  signedUp: '2024-06-30' },
  { id: 'o6',  name: 'Hooli',            slug: 'hooli',        plan: 'enterprise', members: 612, spend: 28100, signedUp: '2022-11-04' },
  { id: 'o7',  name: 'Pied Piper',       slug: 'pied-piper',   plan: 'team',       members: 14,  spend: 380,   signedUp: '2025-03-22' },
  { id: 'o8',  name: 'Dunder Mifflin',   slug: 'dunder',       plan: 'free',       members: 6,   spend: 0,     signedUp: '2026-04-19' },
  { id: 'o9',  name: 'Stark Industries', slug: 'stark',        plan: 'business',   members: 92,  spend: 5210,  signedUp: '2024-03-11' },
  { id: 'o10', name: 'Wayne Enterprises',slug: 'wayne',        plan: 'enterprise', members: 318, spend: 14800, signedUp: '2023-07-29' },
];

export const USERS: AdminUser[] = [
  { id: 'u1', name: 'Sora Kim',     email: 'sora@acme.com',         org: 'acme',      lastSignIn: '2m ago',  status: 'active' },
  { id: 'u2', name: 'Mei Wang',     email: 'mei@northwind.io',      org: 'northwind', lastSignIn: '38m ago', status: 'active' },
  { id: 'u3', name: 'Brad Lee',     email: 'brad@hooli.com',        org: 'hooli',     lastSignIn: '3h ago',  status: 'active' },
  { id: 'u4', name: 'Yuki Sato',    email: 'yuki@globex.co',        org: 'globex',    lastSignIn: '1d ago',  status: 'suspended' },
  { id: 'u5', name: 'Priya Singh',  email: 'priya@stark.io',        org: 'stark',     lastSignIn: 'invited', status: 'invited' },
];

export const JOBS: Job[] = [
  { id: 'job_8f3a-2c91', type: 'agent.run',             state: 'failed',    runtime: '00:02:14', retries: 3, payload: '14.2 KB' },
  { id: 'job_44b1-7e09', type: 'billing.invoice.send',  state: 'running',   runtime: '00:00:48', retries: 0, payload: '3.8 KB'  },
  { id: 'job_91c0-5d72', type: 'search.reindex',        state: 'completed', runtime: '00:08:31', retries: 0, payload: '128 MB'  },
  { id: 'job_72fe-9a18', type: 'agent.run',             state: 'failed',    runtime: '00:01:02', retries: 5, payload: '22.1 KB' },
  { id: 'job_05a9-3411', type: 'webhook.deliver',       state: 'queued',    runtime: '—',        retries: 1, payload: '1.4 KB'  },
  { id: 'job_60e2-8b7d', type: 'org.export',            state: 'completed', runtime: '00:14:22', retries: 0, payload: '512 MB'  },
  { id: 'job_18c7-4a55', type: 'agent.run',             state: 'completed', runtime: '00:03:09', retries: 0, payload: '9.6 KB'  },
  { id: 'job_a3d4-6f10', type: 'billing.usage.rollup',  state: 'queued',    runtime: '—',        retries: 0, payload: '4.0 KB'  },
];

export const FLAGS_SEED: Flag[] = [
  { id: 'agents-v2',           description: 'Next-gen agent runtime with streaming tools.',          rollout: 42,  enabled: true,  acmeForced: true  },
  { id: 'chat-multimodel',     description: 'Allow switching models mid-conversation.',              rollout: 100, enabled: true,  acmeForced: false },
  { id: 'inline-fix-pipeline', description: 'Render fix pipeline status inline in PR conversations.',rollout: 75,  enabled: true,  acmeForced: true  },
  { id: 'billing-portal-v3',   description: 'Updated billing UI with annual prepay flow.',           rollout: 18,  enabled: true,  acmeForced: false },
  { id: 'sso-okta-scim',       description: 'SCIM provisioning for Okta SSO tenants.',               rollout: 60,  enabled: true,  acmeForced: false },
  { id: 'ai-policy-overrides', description: 'Per-workspace overrides on org-level AI policies.',     rollout: 25,  enabled: false, acmeForced: false },
  { id: 'data-export-async',   description: 'Move org export to async background job.',              rollout: 100, enabled: true,  acmeForced: false },
  { id: 'autoscaler-v2',       description: 'New scheduler for background job pool.',                rollout: 8,   enabled: false, acmeForced: false },
];
