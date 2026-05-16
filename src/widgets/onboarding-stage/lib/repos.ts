// Demo repository directory used by the workspace step. Larger than the
// minimal list we shipped first time so we can demo paging, filtering, and
// the monorepo-path picker.

export type Repo = {
  fullName: string;             // e.g. "acme/acme-monorepo"
  visibility: 'private' | 'public';
  language: 'TypeScript' | 'JavaScript' | 'Go' | 'Python' | 'Rust' | 'Ruby';
  size: string;                 // human-readable
  defaultBranch: string;
  branches: string[];
  updatedRel: string;           // human-readable "2h ago"
  monorepo?: boolean;
  paths?: string[];             // monorepo subpaths to choose from
  stars: number;
  description: string;
};

export const REPOS: Repo[] = [
  {
    fullName: 'acme/acme-monorepo',
    visibility: 'private',
    language: 'TypeScript',
    size: '482 MB',
    defaultBranch: 'main',
    branches: ['main', 'develop', 'release/2026.05', 'staging'],
    updatedRel: '2h ago',
    monorepo: true,
    paths: ['apps/web', 'apps/admin', 'apps/mobile', 'packages/ui', 'packages/api', 'services/auth', 'services/billing'],
    stars: 0,
    description: 'Primary monorepo · all product surfaces',
  },
  {
    fullName: 'acme/acme-platform',
    visibility: 'private',
    language: 'Go',
    size: '88 MB',
    defaultBranch: 'main',
    branches: ['main', 'release/v1.18', 'release/v1.17'],
    updatedRel: '1d ago',
    stars: 0,
    description: 'Platform services · search, ingestion, gateway',
  },
  {
    fullName: 'acme/acme-web',
    visibility: 'private',
    language: 'TypeScript',
    size: '64 MB',
    defaultBranch: 'main',
    branches: ['main', 'preview'],
    updatedRel: '4h ago',
    stars: 0,
    description: 'Marketing site',
  },
  {
    fullName: 'acme/data-pipeline',
    visibility: 'private',
    language: 'Python',
    size: '21 MB',
    defaultBranch: 'main',
    branches: ['main', 'experimental/dbt-3'],
    updatedRel: '3d ago',
    stars: 0,
    description: 'Airflow DAGs + dbt project',
  },
  {
    fullName: 'acme/billing-svc',
    visibility: 'private',
    language: 'Go',
    size: '12 MB',
    defaultBranch: 'main',
    branches: ['main'],
    updatedRel: '5d ago',
    stars: 0,
    description: 'Standalone billing service · split from monorepo',
  },
  {
    fullName: 'acme/edge-functions',
    visibility: 'private',
    language: 'Rust',
    size: '4 MB',
    defaultBranch: 'main',
    branches: ['main'],
    updatedRel: '5d ago',
    stars: 0,
    description: 'Edge runtime functions for the CDN',
  },
  {
    fullName: 'acme/legacy-rails-app',
    visibility: 'private',
    language: 'Ruby',
    size: '110 MB',
    defaultBranch: 'master',
    branches: ['master'],
    updatedRel: '3w ago',
    stars: 0,
    description: 'Pre-2022 customer portal · deprecated, scheduled for removal',
  },
  {
    fullName: 'acme/design-system',
    visibility: 'public',
    language: 'TypeScript',
    size: '14 MB',
    defaultBranch: 'main',
    branches: ['main'],
    updatedRel: '6d ago',
    stars: 42,
    description: 'Open-source component library',
  },
  {
    fullName: 'acme/sandbox',
    visibility: 'public',
    language: 'JavaScript',
    size: '2 MB',
    defaultBranch: 'main',
    branches: ['main'],
    updatedRel: '2w ago',
    stars: 7,
    description: 'Throw-away experiments',
  },
];

// Pages of 4. Real APIs would do offset-based; we mimic that on the client.
export const PAGE_SIZE = 4;
