// Seed data for the Changelog page.

import type { Entry } from './types';

export const ENTRIES: Entry[] = [
  {
    id: 'e1', date: '2026-05-08', version: 'v2026.05.0', category: 'New',
    title: 'AI policies, per-org', highlight: true,
    bullets: [
      'Restrict the model picker org-wide and lock down where prompts may travel',
      'Per-class data retention (audit / agent runs / chats), down to 0 days',
      'Live residency conflict warnings — see which models violate your region pick before saving',
    ],
  },
  {
    id: 'e2', date: '2026-05-02', version: 'v2026.04.7', category: 'Improved',
    title: 'Admission rules: severity tri-toggle',
    bullets: [
      'Replace boolean with Block / Warn / Off for every rule',
      'New "Reset to org default" action when a workspace overrides a policy',
      'Inheritance badge per rule shows whether you\'re inheriting or overriding',
    ],
  },
  {
    id: 'e3', date: '2026-04-25', version: 'v2026.04.6', category: 'Fixed',
    title: 'Webhook delivery retry tail',
    bullets: [
      'Endpoints under sustained 5xx no longer get stuck in a 5-minute back-off loop',
      'Failed deliveries can now be redelivered up to 7 days back, not 24h',
    ],
  },
  {
    id: 'e4', date: '2026-04-19', version: 'v2026.04.5', category: 'New',
    title: 'Custom roles (RBAC)',
    bullets: [
      'Duplicate any built-in role and tune its 20 permission toggles',
      'Per-permission danger flag — admission.bypass surfaces in red',
      'Role count + member count visible in the editor at all times',
    ],
  },
  {
    id: 'e5', date: '2026-04-12', version: 'v2026.04.0', category: 'New',
    title: 'Public app catalog',
    bullets: [
      'Browse the 12 surfaces of the Organization settings tree at /catalog',
      'cmd-k search jumps straight to any settings page',
      'Status pills surface which areas are live vs. planned',
    ],
  },
  {
    id: 'e6', date: '2026-03-30', version: 'v2026.03.8', category: 'Improved',
    title: 'Inbox bulk actions',
    bullets: [
      'Hover-revealed checkboxes on every row, with shift-click range select',
      'Mark-read / archive in the top action bar when ≥1 row is selected',
      'Group-by-day stays sticky across filter changes',
    ],
  },
  {
    id: 'e7', date: '2026-03-21', version: 'v2026.03.5', category: 'Fixed',
    title: 'GlassCard backdrop refraction in Safari',
    bullets: [
      'Removed an ancestor `transform: translateZ(0)` that was killing backdrop-filter',
      'Affects InspectPanel, FilterBar, and the chat agent tray',
    ],
  },
  {
    id: 'e8', date: '2026-03-12', version: 'v2026.03.0', category: 'New',
    title: 'Investigation handoff',
    bullets: [
      'Pass an in-progress investigation directly into fix-pipeline with full context',
      'Breadcrumb on the receiving side shows the original investigator + timestamp',
      'Followup strip suggests the next 3 likely actions based on the handoff payload',
    ],
  },
];
