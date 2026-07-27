// Hero tiles (surfaceId + copy + order) now live with the surface metadata SoT
// in @shared/config/surfaces (HERO_SURFACES) — placement travels with identity.

export type RecentRepo = {
  slug: string;
  branch: string;
  status: 'changes' | 'clean' | 'review';
  statusLabel: string;
  diffAdded?: number;
  diffRemoved?: number;
  badges?: { label: string; tone: 'merged' | 'rebased' | 'cve' | 'tag' }[];
  sparkline: number[];
  lastTouched: string;
  quiet?: boolean;
};

export const RECENT_REPOS: RecentRepo[] = [
  {
    slug: 'payments-api',
    branch: 'main',
    status: 'changes',
    statusLabel: '3 changes',
    diffAdded: 240,
    diffRemoved: 87,
    sparkline: [2, 5, 3, 8, 6, 9, 4, 7, 10, 6],
    lastTouched: '1h ago',
  },
  {
    slug: 'order-service',
    branch: 'feat/checkout',
    status: 'clean',
    statusLabel: 'clean',
    sparkline: [0, 2, 1, 0, 3, 1, 0, 2, 0, 1],
    lastTouched: '3h ago',
    quiet: true,
  },
  {
    slug: 'ledger-core',
    branch: 'main',
    status: 'review',
    statusLabel: '12 in review',
    diffAdded: 1200,
    diffRemoved: 340,
    badges: [
      { label: 'merged', tone: 'merged' },
      { label: 'rebased', tone: 'rebased' },
    ],
    sparkline: [4, 7, 5, 8, 6, 9, 11, 8, 10, 7],
    lastTouched: 'yesterday',
  },
  {
    slug: 'auth-gateway',
    branch: 'release/0.4',
    status: 'changes',
    statusLabel: '1 change',
    diffAdded: 45,
    diffRemoved: 8,
    badges: [{ label: 'v0.4', tone: 'tag' }],
    sparkline: [1, 2, 3, 5, 8, 6, 4, 3, 2, 1],
    lastTouched: '2d ago',
  },
];

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}
