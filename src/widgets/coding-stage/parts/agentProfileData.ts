// Demo fixtures for the agent customization profile system. Kept apart
// from `data.ts` so the chat fixtures (already big) don't grow further,
// and so the marketplace listings live next to the profiles they imitate.
//
// Shape contract: every project should ship with at least the 3 built-in
// modes (Builder / Reviewer / Sandbox) so the mode chip is never empty.
// Rules and workflows are project-specific.

import type {
  AgentProfile, AgentRule, AgentMode, AgentWorkflow, MarketplaceProfile,
} from './types';

const NOW = Date.now();
const MIN = 60_000;

// ─── Built-in modes ──────────────────────────────────────────────────────
// Three opinionated defaults — the equivalent of Roo Code's
// Architect/Code/Debug. Ship with every project; user-authored modes are
// added on top.

export const BUILT_IN_MODES: AgentMode[] = [
  {
    id: 'mode-builder',
    name: 'Builder',
    blurb: 'Edit + run + push, on-rails for feature work',
    icon: 'hammer',
    accent: 'emerald',
    systemPrompt: 'You ship working code. Read first, plan second, edit third. Run tests after every meaningful change. Stop and ask before any irreversible operation (push, merge, delete).',
    allowedTools: ['read', 'edit', 'run', 'search', 'plan'],
    preferredModel: 'claude-opus-4-7',
    trust: 3,
    system: true,
  },
  {
    id: 'mode-reviewer',
    name: 'Reviewer',
    blurb: 'Read-only. Proposes, never writes',
    icon: 'shield',
    accent: 'sky',
    systemPrompt: 'You review and propose. Never write to the working tree. Cite specific files and lines for every claim. When uncertain, say so explicitly with a confidence percentage.',
    allowedTools: ['read', 'search', 'plan'],
    preferredModel: 'claude-sonnet-4-6',
    trust: 1,
    system: true,
  },
  {
    id: 'mode-sandbox',
    name: 'Sandbox',
    blurb: 'Full autonomy in scratch branches',
    icon: 'flask',
    accent: 'violet',
    systemPrompt: 'You experiment. Try things fast, branch liberally, throw away what does not work. Never push to main. Summarize at the end with what you learned.',
    allowedTools: ['read', 'edit', 'run', 'search', 'plan', 'web'],
    preferredModel: 'claude-opus-4-7',
    trust: 5,
    system: true,
  },
];

// ─── Sample rules ────────────────────────────────────────────────────────
// One of each `source` so the rule list shows the badge variety.

const ACME_RULES: AgentRule[] = [
  {
    id: 'r-acme-1',
    name: 'Vitest, never Jest mocks',
    body: 'Tests run on Vitest. Never use `jest.mock` or `jest.fn` — use `vi.mock` and `vi.fn`. The codebase is Vitest-only; importing from `jest` will fail at runtime.',
    globs: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    scope: 'always',
    enabled: true,
    source: 'authored',
    updatedAtMs: NOW - 6 * 60 * MIN,
  },
  {
    id: 'r-acme-2',
    name: 'No left-edge accent bars',
    body: 'Never use a coloured left-edge stripe on rows, cards, or banners. Use a small leading icon or background tint instead. The user has called this out 3+ times — strong dislike.',
    globs: ['src/**/*.tsx'],
    scope: 'always',
    enabled: true,
    source: 'pain-point',
    fromTurnId: 'a1', // back-ref to demo turn t-001/a1
    updatedAtMs: NOW - 38 * MIN,
  },
  {
    id: 'r-acme-3',
    name: 'Public surface diffs need migration notes',
    body: 'When changing files under `src/api/` or any `.d.ts`, append a 2-line migration note describing the old vs new shape. Reviewers downstream rely on this.',
    globs: ['src/api/**/*.ts', '**/*.d.ts'],
    scope: 'always',
    enabled: true,
    source: 'diff-pattern',
    updatedAtMs: NOW - 2 * 60 * MIN,
  },
  {
    id: 'r-acme-4',
    name: 'Glassmorphism on chrome panels',
    body: 'Panels keep alpha 0.3–0.45 (dark) or 0.5–0.7 (light) plus backdrop-blur. Do NOT bump alpha to fix readability — fix contrast at the foreground.',
    globs: ['src/widgets/**/*.tsx', 'src/shared/ui/**/*.tsx'],
    scope: 'requested',
    enabled: true,
    source: 'pain-point',
    fromTurnId: 'a2',
    updatedAtMs: NOW - 3 * 60 * MIN,
  },
  {
    id: 'r-acme-5',
    name: 'Strict Korean prose',
    body: 'When generating user-facing copy in Korean, use 합쇼체 by default. Never mix 해요체 and 합쇼체 in the same string.',
    globs: ['**/locales/ko/**/*.json'],
    scope: 'always',
    enabled: false,
    source: 'authored',
    updatedAtMs: NOW - 5 * 24 * 60 * MIN,
  },
];

const QUANTA_RULES: AgentRule[] = [
  {
    id: 'r-quanta-1',
    name: 'Hooks-only state',
    body: 'No new class components. Use hooks + Zustand store. Existing class components stay until refactored — do not partially migrate.',
    globs: ['src/**/*.tsx', 'src/**/*.ts'],
    scope: 'always',
    enabled: true,
    source: 'authored',
    updatedAtMs: NOW - 1 * 24 * 60 * MIN,
  },
  {
    id: 'r-quanta-2',
    name: 'Receipts must round-trip',
    body: 'Any change touching `receipt.ts` must include a property test verifying serialize → deserialize roundtrip. Past regressions traced to silent precision loss.',
    globs: ['src/**/receipt*.ts'],
    scope: 'always',
    enabled: true,
    source: 'pain-point',
    fromTurnId: 'a-quanta-1',
    updatedAtMs: NOW - 2 * 60 * MIN,
  },
];

// ─── Sample workflows ────────────────────────────────────────────────────

const ACME_WORKFLOWS: AgentWorkflow[] = [
  {
    id: 'w-acme-1',
    slug: 'ship-pr',
    name: 'Ship PR',
    blurb: 'Tests → PR description → reviewers → wait for CI',
    steps: [
      'Run the full test suite, fix anything red before continuing.',
      'Generate a PR description summarising the *why*, not the *what*.',
      'Pick reviewers based on CODEOWNERS for the touched files.',
      'Push the branch and open the PR; wait for the first CI signal.',
      'Surface CI failures back to the user with the specific failing line.',
    ],
    pairedModeId: 'mode-reviewer',
  },
  {
    id: 'w-acme-2',
    slug: 'reproduce-bug',
    name: 'Reproduce bug',
    blurb: 'Issue → failing test → minimum repro → fix proposal',
    steps: [
      'Read the linked issue or stack trace; restate the bug in 1 sentence.',
      'Write a *failing* test that captures the bug — verify it fails for the right reason.',
      'Bisect the test against recent commits if the bug is regression-shaped.',
      'Propose the smallest possible fix; do not apply without confirmation.',
    ],
  },
  {
    id: 'w-acme-3',
    slug: 'rewrite-prose',
    name: 'Rewrite copy',
    blurb: 'i18n-safe copy edits across all locales',
    steps: [
      'Find the matching key across en/ja/ko/zh locale files.',
      'Rewrite each locale in its native register, not as a literal translation.',
      'Sanity-check that placeholder tokens (`{{name}}`) appear identically across locales.',
    ],
  },
];

// ─── Marketplace listings ────────────────────────────────────────────────
// Hand-authored. Real impl would query a public registry. Numbers are
// chosen to feel plausible without round-numbers or obvious patterns.

export const MARKETPLACE_PROFILES: MarketplaceProfile[] = [
  {
    id: 'mp-1',
    name: 'Next.js App Router · 2026',
    author: '@vercel-community',
    domain: 'frontend',
    blurb: 'Server components, streaming, parallel routes. Includes a "ship-pr" playbook tuned for App Router projects.',
    installs: 14_280,
    rating: 4.7,
    preview: { rules: 12, modes: 2, workflows: 4 },
  },
  {
    id: 'mp-2',
    name: 'Rust on Embedded',
    author: '@bjorn-systems',
    domain: 'backend',
    blurb: 'no_std-aware rules, Probe-rs flashing workflow, panic-on-alloc guards. Reviewer mode is locked to read-only.',
    installs: 3_412,
    rating: 4.9,
    preview: { rules: 18, modes: 3, workflows: 2 },
  },
  {
    id: 'mp-3',
    name: 'PyTorch Research Cookbook',
    author: '@ml-collective',
    domain: 'ml',
    blurb: 'Notebook-aware editing, deterministic-seed tests, wandb run scaffolding. Trust dial defaults to 2.',
    installs: 8_904,
    rating: 4.5,
    preview: { rules: 9, modes: 2, workflows: 6 },
  },
  {
    id: 'mp-4',
    name: 'Terraform · prod-safe',
    author: '@hashicorp-dx',
    domain: 'devops',
    blurb: 'Plan-only by default, blast-radius preview before apply, state-lock detection. Built for shared envs.',
    installs: 5_637,
    rating: 4.8,
    preview: { rules: 14, modes: 4, workflows: 3 },
  },
  {
    id: 'mp-5',
    name: 'React Native · Expo SDK 54',
    author: '@expo-team',
    domain: 'mobile',
    blurb: 'EAS build awareness, simulator-only test loop, native module migration helpers.',
    installs: 6_120,
    rating: 4.4,
    preview: { rules: 11, modes: 2, workflows: 5 },
  },
  {
    id: 'mp-6',
    name: 'Go services · gRPC-first',
    author: '@buf-build',
    domain: 'backend',
    blurb: 'Protobuf-aware diff review, breaking-change linter rule, end-to-end gRPC fixture workflow.',
    installs: 4_801,
    rating: 4.6,
    preview: { rules: 15, modes: 3, workflows: 4 },
  },
];

// ─── Per-project profiles ────────────────────────────────────────────────

export function buildAcmeProfile(): AgentProfile {
  return {
    rules: ACME_RULES,
    modes: BUILT_IN_MODES,
    workflows: ACME_WORKFLOWS,
    activeModeId: 'mode-builder',
    importedFromId: 'mp-1',
  };
}

export function buildQuantaProfile(): AgentProfile {
  return {
    rules: QUANTA_RULES,
    modes: BUILT_IN_MODES,
    workflows: [
      {
        id: 'w-quanta-1',
        slug: 'verify-receipt',
        name: 'Verify receipt',
        blurb: 'Round-trip + property-test sanity for receipt changes',
        steps: [
          'Find every callsite of the receipt serialize/deserialize pair.',
          'Add a property test for the new shape if missing.',
          'Run the suite with seeded RNG; report any non-deterministic failure.',
        ],
      },
    ],
    activeModeId: 'mode-builder',
  };
}

export function buildEdgeProfile(): AgentProfile {
  return {
    rules: [
      {
        id: 'r-edge-1',
        name: 'Cold-start budget',
        body: 'Edge functions must boot in under 50ms. Reject imports that pull in node-only modules.',
        globs: ['src/edge/**/*.ts'],
        scope: 'always',
        enabled: true,
        source: 'authored',
        updatedAtMs: NOW - 12 * 60 * MIN,
      },
    ],
    modes: BUILT_IN_MODES,
    workflows: [],
    activeModeId: 'mode-reviewer',
  };
}

export function buildPulseProfile(): AgentProfile {
  return {
    rules: [],
    modes: BUILT_IN_MODES,
    workflows: [],
    activeModeId: 'mode-builder',
  };
}

// Used by `startNewProject` so a freshly-created project still has the
// 3 built-in modes — that way the ModeChip in the header isn't missing
// and the user can immediately open the customisation modal to author
// rules/workflows.
export function buildBlankProfile(): AgentProfile {
  return {
    rules: [],
    modes: BUILT_IN_MODES,
    workflows: [],
    activeModeId: 'mode-builder',
  };
}
