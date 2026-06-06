export type ScopeId =
  | 'read:repo' | 'write:repo'
  | 'read:investigations' | 'write:investigations'
  | 'read:reviews' | 'write:reviews'
  | 'admin:org' | 'admin:billing'
  | 'agents:run';

export type Scope = { id: ScopeId; label: string; sub: string; danger?: boolean };

export const SCOPE_GROUPS: { title: string; scopes: Scope[] }[] = [
  {
    title: 'Repository',
    scopes: [
      { id: 'read:repo',  label: 'read:repo',  sub: 'Read repos, files, blame, branches' },
      { id: 'write:repo', label: 'write:repo', sub: 'Open PRs, push branches, create commits', danger: true },
    ],
  },
  {
    title: 'Investigations & reviews',
    scopes: [
      { id: 'read:investigations',  label: 'read:investigations',  sub: 'Read investigation history, evidence' },
      { id: 'write:investigations', label: 'write:investigations', sub: 'Create new investigations and add evidence' },
      { id: 'read:reviews',         label: 'read:reviews',         sub: 'Read PR reviews, comments, conversations' },
      { id: 'write:reviews',        label: 'write:reviews',        sub: 'Post comments and approvals' },
    ],
  },
  {
    title: 'Agents',
    scopes: [
      { id: 'agents:run', label: 'agents:run', sub: 'Trigger AI agents on your behalf', danger: true },
    ],
  },
  {
    title: 'Admin',
    scopes: [
      { id: 'admin:org',     label: 'admin:org',     sub: 'Manage members, teams, policies', danger: true },
      { id: 'admin:billing', label: 'admin:billing', sub: 'View invoices and change plan',   danger: true },
    ],
  },
];

export const ALL_SCOPES = SCOPE_GROUPS.flatMap((g) => g.scopes);

export type Token = {
  id: string;
  name: string;
  scopes: ScopeId[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  prefix: string;            // visible portion, e.g. "sef_a82f"
};

export const INITIAL_TOKENS: Token[] = [
  { id: 't1', name: 'CI · gh-actions',     scopes: ['read:repo', 'read:reviews', 'write:reviews'], createdAt: '2025-09-12', expiresAt: '2026-09-12', lastUsedAt: '4 minutes ago', prefix: 'sef_a82f' },
  { id: 't2', name: 'Local CLI · MacBook', scopes: ['read:repo', 'read:investigations'],            createdAt: '2025-11-04', expiresAt: null,         lastUsedAt: '2 hours ago',   prefix: 'sef_19q3' },
  { id: 't3', name: 'review-bot · Slack',  scopes: ['read:reviews'],                                 createdAt: '2026-02-19', expiresAt: '2026-08-19', lastUsedAt: '3 days ago',    prefix: 'sef_x7lm' },
  { id: 't4', name: 'old laptop · DELETED soon', scopes: ['read:repo'],                              createdAt: '2024-12-02', expiresAt: '2025-12-02', lastUsedAt: 'Never',         prefix: 'sef_unus' },
];
