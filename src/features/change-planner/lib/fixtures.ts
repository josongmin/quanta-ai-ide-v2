// Demo fixtures for the change planner.
//
// The adjacency map is hand-tuned to exercise every codepath in the planner:
//   - 'src/auth/session.ts' has multiple direct dependents → seam emitted
//   - it also reaches a config flag and a route → mixed-layer split
//   - tests are wired in deliberately so verification layer isn't empty
// Real adapters wire this to the engine's call graph; the shape stays
// identical so swapping data sources doesn't ripple into the UI.

import type { ChangeSeed } from '../model/types';

export const MOCK_ADJACENCY: Record<string, string[]> = {
  // Seed 1: a session helper deep in the auth layer.
  'src/auth/session.ts': [
    'src/auth/login.ts',
    'src/auth/refresh.ts',
    'src/api/middleware/authGuard.ts',
  ],
  'src/auth/login.ts': [
    'src/routes/loginHandler.ts',
    'src/auth/session.test.ts',
  ],
  'src/auth/refresh.ts': [
    'src/routes/refreshHandler.ts',
    'config/auth.flags.ts',
  ],
  'src/api/middleware/authGuard.ts': [
    'src/routes/loginHandler.ts',
    'src/routes/refreshHandler.ts',
  ],
  'src/routes/loginHandler.ts': [
    'src/routes/loginHandler.test.ts',
  ],
  'src/routes/refreshHandler.ts': [
    'src/routes/refreshHandler.test.ts',
  ],

  // Seed 2: a single API route — narrower fanout, no seam expected.
  'src/api/billing/invoice.ts': [
    'src/api/billing/invoice.test.ts',
  ],

  // Seed 3: a config flag that lights up several callers — the planner
  // should pick this up as a delivery-layer change.
  'config/feature.flags.ts': [
    'src/auth/session.ts',
    'src/api/billing/invoice.ts',
    'config/feature.flags.test.ts',
  ],
};

export const MOCK_SEEDS: ChangeSeed[] = [
  {
    id: 'seed-session',
    kind: 'symbol',
    targetId: 'src/auth/session.ts',
    label: 'auth/session.ts',
  },
  {
    id: 'seed-invoice',
    kind: 'api',
    targetId: 'src/api/billing/invoice.ts',
    label: 'billing/invoice.ts',
  },
  {
    id: 'seed-feature-flag',
    kind: 'config_key',
    targetId: 'config/feature.flags.ts',
    label: 'feature.flags',
  },
];
