// Seed data for the Status page.

import {
  Server, Globe, Bot, Webhook, ShieldCheck, KeyRound, Cloud, Database,
} from 'lucide-react';
import type { Incident, Region, Service } from './types';

export const SERVICES: Service[] = [
  { id: 'api',        name: 'API',                description: 'REST + GraphQL',                icon: Server,      status: 'operational' },
  { id: 'web',        name: 'Web app',            description: 'app.acme.com',                  icon: Globe,       status: 'operational' },
  { id: 'agents',     name: 'Agent runtime',      description: 'Autonomous runs',               icon: Bot,         status: 'operational' },
  { id: 'webhooks',   name: 'Webhook delivery',   description: 'Org + workspace endpoints',     icon: Webhook,     status: 'operational' },
  { id: 'admission',  name: 'Admission gates',    description: 'Pre-merge policy checks',       icon: ShieldCheck, status: 'operational' },
  { id: 'auth',       name: 'Authentication',     description: 'Sign-in, SSO, MFA',             icon: KeyRound,    status: 'operational' },
  { id: 'cdn',        name: 'CDN',                description: 'Static assets + docs',          icon: Cloud,       status: 'operational' },
  { id: 'db',         name: 'Database',           description: 'Primary + read replicas',       icon: Database,    status: 'operational' },
];

export const REGIONS: Region[] = [
  { id: 'us-east',  label: 'US East (Virginia)', lat: 42, lon: 26, status: 'operational', latencyMs:  18 },
  { id: 'us-west',  label: 'US West (Oregon)',   lat: 38, lon: 14, status: 'operational', latencyMs:  22 },
  { id: 'eu-west',  label: 'EU West (Dublin)',   lat: 30, lon: 48, status: 'operational', latencyMs:  31 },
  { id: 'eu-cent',  label: 'EU Central (Frankfurt)', lat: 32, lon: 53, status: 'operational', latencyMs: 28 },
  { id: 'ap-ne',    label: 'AP Northeast (Tokyo)', lat: 44, lon: 86, status: 'operational', latencyMs: 42 },
  { id: 'ap-se',    label: 'AP Southeast (Singapore)', lat: 60, lon: 78, status: 'operational', latencyMs: 47 },
];

export const INCIDENTS: Incident[] = [
  {
    id: 'inc-2026-05-08',
    title: 'Webhook delivery delays in EU region',
    status: 'monitoring',
    startedAt: '2026-05-08 14:32 UTC',
    affected: ['Webhook delivery', 'Agent runtime'],
    updates: [
      { at: '2026-05-08 16:10 UTC', status: 'Monitoring',  body: 'Delivery latency normalized over the past 60 minutes. We\'re monitoring for one more hour before marking resolved.' },
      { at: '2026-05-08 15:18 UTC', status: 'Identified',   body: 'Root cause traced to a noisy neighbor on the EU webhook worker pool. Shifted load and added isolation.' },
      { at: '2026-05-08 14:32 UTC', status: 'Investigating',body: 'Some EU customers are seeing 30-90s delays on webhook delivery. Investigating now.' },
    ],
  },
  {
    id: 'inc-2026-05-02',
    title: 'Admission gate evaluation slow',
    status: 'resolved',
    startedAt: '2026-05-02 09:14 UTC',
    resolvedAt: '2026-05-02 10:48 UTC',
    affected: ['Admission gates'],
    updates: [
      { at: '2026-05-02 10:48 UTC', status: 'Resolved',     body: 'Gate evaluations are back to normal. Postmortem in 48h.' },
      { at: '2026-05-02 09:55 UTC', status: 'Identified',   body: 'A bad migration was holding row locks. Rolled back.' },
      { at: '2026-05-02 09:14 UTC', status: 'Investigating',body: 'Customers may see admission gates take 5-10s to evaluate.' },
    ],
  },
  {
    id: 'inc-2026-04-21',
    title: 'CDN error rate spike (5xx)',
    status: 'resolved',
    startedAt: '2026-04-21 03:02 UTC',
    resolvedAt: '2026-04-21 03:34 UTC',
    affected: ['CDN', 'Web app'],
    updates: [
      { at: '2026-04-21 03:34 UTC', status: 'Resolved',     body: 'Provider issue resolved upstream.' },
      { at: '2026-04-21 03:18 UTC', status: 'Identified',   body: 'Confirmed upstream CDN provider incident.' },
      { at: '2026-04-21 03:02 UTC', status: 'Investigating',body: 'Elevated 5xx on static asset requests.' },
    ],
  },
];
