// Data-driven refactor-action registry.
//
// Extracted from RefactorActionsBox's synthesis useMemo: each entry declares
// *when* a heuristic action applies and how to *build* it from the file's
// metrics. The component maps/filters over this array instead of hosting six
// hand-inlined `if (…) out.push(…)` blocks, so adding an action is one entry
// (Open/Closed) and the confidence/tone classification stays co-located with
// the condition that produces it.
//
// In production this catalog comes from the engine's patch proposer; here we
// synthesize stable suggestions per file from metrics already present so the
// demo reads coherently.

import type { FileRecord } from '@entities/repo';

export type DiffLine = { kind: '-' | '+' | ' '; text: string };

export type Action = {
  id: string;
  title: string;
  delta: string;          // e.g. "cyc 43 → 12"
  confidence: number;     // 0..100
  blast: number;          // affected files
  tone: 'auto' | 'review';
  diff: DiffLine[];       // synthetic preview body
};

type Metrics = FileRecord['metrics'];
// `t` matches react-i18next's signature used in the box (key + options).
type T = (key: string, opts?: Record<string, unknown>) => string;

// ── Synthetic diff library ────────────────────────────────────────────
// We don't run a real refactor-aware AST engine in the demo, so each patch
// carries a curated "before/after" body that captures the kind of change the
// action represents. Shared by all files so the engine reads as deterministic;
// in production these come from the patch proposer's actual rewrite output.

const DIFF_EXTRACT: DiffLine[] = [
  { kind: ' ', text: 'export function process(input: Payload) {' },
  { kind: '-', text: '  if (input.user && input.user.session && input.user.session.token) {' },
  { kind: '-', text: '    if (input.flags.beta || input.flags.staff) {' },
  { kind: '-', text: '      if (cache.has(input.user.id)) {' },
  { kind: '-', text: '        return cache.get(input.user.id);' },
  { kind: '-', text: '      }' },
  { kind: '-', text: '    }' },
  { kind: '-', text: '  }' },
  { kind: '+', text: '  const cached = lookupCachedSession(input);' },
  { kind: '+', text: '  if (cached) return cached;' },
  { kind: ' ', text: '  return compute(input);' },
  { kind: ' ', text: '}' },
  { kind: ' ', text: '' },
  { kind: '+', text: 'function lookupCachedSession(input: Payload) {' },
  { kind: '+', text: '  const ok = input.user?.session?.token' },
  { kind: '+', text: '    && (input.flags.beta || input.flags.staff);' },
  { kind: '+', text: '  return ok ? cache.get(input.user!.id) : null;' },
  { kind: '+', text: '}' },
];

const DIFF_TYPES: DiffLine[] = [
  { kind: '-', text: 'function format(value: any, opts: any) {' },
  { kind: '+', text: 'function format(value: FormatInput, opts: FormatOptions): string {' },
  { kind: ' ', text: '  return opts.locale' },
  { kind: '-', text: '    ? value.toLocaleString(opts.locale)' },
  { kind: '+', text: '    ? value.toLocaleString(opts.locale)' },
  { kind: ' ', text: '    : String(value);' },
  { kind: ' ', text: '}' },
];

const DIFF_TSIGNORE: DiffLine[] = [
  { kind: '-', text: '// @ts-ignore — legacy SDK has incorrect types' },
  { kind: '-', text: 'sdk.connect(config);' },
  { kind: '+', text: 'sdk.connect(config as ConnectArgs);' },
  { kind: ' ', text: '// type assertion narrowed at the boundary' },
];

const DIFF_DEAD: DiffLine[] = [
  { kind: ' ', text: 'export function reducer(state, action) {' },
  { kind: ' ', text: '  switch (action.type) {' },
  { kind: ' ', text: '    case "ADD":   return [...state, action.item];' },
  { kind: '-', text: '    case "LEGACY_DELETE_v1": // unused since 2024' },
  { kind: '-', text: '      return state.filter(x => x.id !== action.id);' },
  { kind: ' ', text: '    case "DELETE": return state.filter(x => x.id !== action.id);' },
  { kind: ' ', text: '    default:      return state;' },
  { kind: ' ', text: '  }' },
  { kind: ' ', text: '}' },
];

const DIFF_ADDTEST: DiffLine[] = [
  { kind: '+', text: "import { describe, it, expect } from 'vitest';" },
  { kind: '+', text: "import { format } from './format';" },
  { kind: '+', text: '' },
  { kind: '+', text: "describe('format', () => {" },
  { kind: '+', text: "  it('uses locale when provided', () => {" },
  { kind: '+', text: "    expect(format(1234.5, { locale: 'ko-KR' })).toMatch(/1,234/);" },
  { kind: '+', text: '  });' },
  { kind: '+', text: "  it('falls back to String() without locale', () => {" },
  { kind: '+', text: "    expect(format(42, {})).toBe('42');" },
  { kind: '+', text: '  });' },
  { kind: '+', text: '});' },
];

const DIFF_LINT: DiffLine[] = [
  { kind: '-', text: 'const result = items.map(x => { return x.value })' },
  { kind: '+', text: 'const result = items.map((x) => x.value);' },
  { kind: '-', text: 'if (a == null) return' },
  { kind: '+', text: 'if (a == null) return;' },
];

// ── Action registry ───────────────────────────────────────────────────
// Each rule: `when` decides applicability from the file/metrics; `build`
// produces the concrete Action (delta / confidence / tone / diff). The order
// here is irrelevant — the box sorts auto-first by confidence afterwards.
export type ActionRule = {
  id: string;
  when: (m: Metrics, file: FileRecord) => boolean;
  build: (m: Metrics, file: FileRecord, t: T) => Action;
};

export const ACTION_RULES: ActionRule[] = [
  {
    id: 'extract',
    when: (m) => m.complexity >= 25 && m.fnCount > 0,
    build: (m, _file, t) => {
      const target = Math.max(8, Math.round(m.complexity / 3));
      return {
        id: 'extract',
        title: t('refactor.extract.title', { defaultValue: 'Extract function' }),
        delta: `cyc ${m.complexity} → ${target}`,
        confidence: m.editSafety >= 70 ? 95 : 78,
        blast: m.fanIn,
        tone: m.editSafety >= 70 && m.fanIn <= 2 ? 'auto' : 'review',
        diff: DIFF_EXTRACT,
      };
    },
  },
  {
    id: 'types',
    when: (m) => m.anyCount > 0,
    build: (m, _file, t) => ({
      id: 'types',
      title: t('refactor.types.title', { defaultValue: 'Add explicit types' }),
      delta: `any ${m.anyCount} → 0`,
      confidence: 98,
      blast: 0,
      tone: 'auto',
      diff: DIFF_TYPES,
    }),
  },
  {
    id: 'tsignore',
    when: (m) => m.tsIgnoreCount > 0,
    build: (m, _file, t) => ({
      id: 'tsignore',
      title: t('refactor.tsignore.title', { defaultValue: 'Resolve @ts-ignore' }),
      delta: `${m.tsIgnoreCount} → 0`,
      confidence: 72,
      blast: 0,
      tone: 'review',
      diff: DIFF_TSIGNORE,
    }),
  },
  {
    id: 'dead',
    when: (m) => m.dead,
    build: (m, _file, t) => ({
      id: 'dead',
      title: t('refactor.dead.title', { defaultValue: 'Remove dead code' }),
      delta: t('refactor.dead.delta', { loc: m.loc, defaultValue: `−${Math.round(m.loc * 0.15)} LOC` }),
      confidence: 92,
      blast: 0,
      tone: 'auto',
      diff: DIFF_DEAD,
    }),
  },
  {
    id: 'addtest',
    when: (m, file) => !m.hasTestFile && file.layer !== 'vendor',
    build: (m, _file, t) => ({
      id: 'addtest',
      title: t('refactor.addtest.title', { defaultValue: 'Generate test scaffold' }),
      delta: t('refactor.addtest.delta', { defaultValue: '+1 test file' }),
      confidence: m.editSafety >= 60 ? 88 : 65,
      blast: 1,
      tone: m.editSafety >= 60 ? 'auto' : 'review',
      diff: DIFF_ADDTEST,
    }),
  },
  {
    id: 'lint',
    when: (m) => m.eslintErrors > 0,
    build: (m, _file, t) => ({
      id: 'lint',
      title: t('refactor.lint.title', { defaultValue: 'Auto-fix lint errors' }),
      delta: `${m.eslintErrors} → 0`,
      confidence: 99,
      blast: 0,
      tone: 'auto',
      diff: DIFF_LINT,
    }),
  },
];
