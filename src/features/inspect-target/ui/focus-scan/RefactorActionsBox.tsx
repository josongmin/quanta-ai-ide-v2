import { useMemo, useState } from 'react';
import { Wand2, Check, ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Refactor-actions box — the "machine" face of the inspector. The legacy
// proposal list (RefactorBlock) advised the human; this box proposes
// concrete *patches* the engine can apply, each annotated with a
// confidence score and a blast radius. Two tiers visually:
//   1. Auto-apply candidates (green) — confidence ≥ 90, blast ≤ 2
//   2. Plan / review candidates  (amber) — anything else
// Each row shows the metric delta the patch achieves, so the user can
// judge value vs risk before clicking.

type DiffLine = { kind: '-' | '+' | ' '; text: string };

type Action = {
  id: string;
  title: string;
  delta: string;          // e.g. "cyc 43 → 12"
  confidence: number;     // 0..100
  blast: number;          // affected files
  tone: 'auto' | 'review';
  diff: DiffLine[];       // synthetic preview body
};

// ── Synthetic diff library ────────────────────────────────────────────
// We don't run a real refactor-aware AST engine in the demo, so each
// patch carries a curated "before/after" body that captures the kind
// of change the action represents. Shared by all files so the engine
// reads as deterministic; in production these come from the patch
// proposer's actual rewrite output.

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

export function RefactorActionsBox({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const m = file.metrics;

  // Heuristic action catalog. In production this comes from the engine's
  // patch proposer; here we synthesize stable suggestions per file based
  // on the metrics already present so the demo reads coherently.
  //
  // Memoised on `m` and `file.layer` so the 6 conditional pushes + sort +
  // filter-count below don't fire on every parent re-render (e.g. when
  // the panel's collapsed-state state changes).
  const { actions, autoCount, totalCount } = useMemo(() => {
    const out: Action[] = [];

    if (m.complexity >= 25 && m.fnCount > 0) {
      const target = Math.max(8, Math.round(m.complexity / 3));
      out.push({
        id: 'extract',
        title: t('refactor.extract.title', { defaultValue: 'Extract function' }),
        delta: `cyc ${m.complexity} → ${target}`,
        confidence: m.editSafety >= 70 ? 95 : 78,
        blast: m.fanIn,
        tone: m.editSafety >= 70 && m.fanIn <= 2 ? 'auto' : 'review',
        diff: DIFF_EXTRACT,
      });
    }

    if (m.anyCount > 0) {
      out.push({
        id: 'types',
        title: t('refactor.types.title', { defaultValue: 'Add explicit types' }),
        delta: `any ${m.anyCount} → 0`,
        confidence: 98,
        blast: 0,
        tone: 'auto',
        diff: DIFF_TYPES,
      });
    }

    if (m.tsIgnoreCount > 0) {
      out.push({
        id: 'tsignore',
        title: t('refactor.tsignore.title', { defaultValue: 'Resolve @ts-ignore' }),
        delta: `${m.tsIgnoreCount} → 0`,
        confidence: 72,
        blast: 0,
        tone: 'review',
        diff: DIFF_TSIGNORE,
      });
    }

    if (m.dead) {
      out.push({
        id: 'dead',
        title: t('refactor.dead.title', { defaultValue: 'Remove dead code' }),
        delta: t('refactor.dead.delta', { loc: m.loc, defaultValue: `−${Math.round(m.loc * 0.15)} LOC` }),
        confidence: 92,
        blast: 0,
        tone: 'auto',
        diff: DIFF_DEAD,
      });
    }

    if (!m.hasTestFile && file.layer !== 'vendor') {
      out.push({
        id: 'addtest',
        title: t('refactor.addtest.title', { defaultValue: 'Generate test scaffold' }),
        delta: t('refactor.addtest.delta', { defaultValue: '+1 test file' }),
        confidence: m.editSafety >= 60 ? 88 : 65,
        blast: 1,
        tone: m.editSafety >= 60 ? 'auto' : 'review',
        diff: DIFF_ADDTEST,
      });
    }

    if (m.eslintErrors > 0) {
      out.push({
        id: 'lint',
        title: t('refactor.lint.title', { defaultValue: 'Auto-fix lint errors' }),
        delta: `${m.eslintErrors} → 0`,
        confidence: 99,
        blast: 0,
        tone: 'auto',
        diff: DIFF_LINT,
      });
    }

    // Sort: auto first (confidence desc), then review (confidence desc).
    out.sort((a, b) => {
      if (a.tone !== b.tone) return a.tone === 'auto' ? -1 : 1;
      return b.confidence - a.confidence;
    });

    let auto = 0;
    for (const a of out) if (a.tone === 'auto') auto += 1;
    return { actions: out, autoCount: auto, totalCount: out.length };
  }, [m, file.layer, t]);

  if (totalCount === 0) {
    return (
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
          <div
            className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('refactor.title', { defaultValue: 'Refactor actions' })}
          </div>
        </div>
        <div
          className="mt-2 text-[10px] italic"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('refactor.empty', { defaultValue: 'No automatic refactors available — this file is in good shape.' })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b"
           style={{ borderColor: 'var(--border-muted)' }}>
        <Wand2 className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <div
          className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('refactor.title', { defaultValue: 'Refactor actions' })}
        </div>
        <span
          className="ml-auto text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('refactor.summary', {
            auto: autoCount,
            total: totalCount,
            defaultValue: `${autoCount}/${totalCount} auto`,
          })}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
        {actions.map((a) => (
          <ActionRow key={a.id} action={a} />
        ))}
      </div>

      {/* Batch hint — production would read similar files from the engine */}
      <button
        type="button"
        className="w-full px-3 py-2 text-left text-[10px] flex items-center gap-1.5 transition-colors hover-surface border-t"
        style={{
          color: 'var(--fg-muted)',
          borderColor: 'var(--border-muted)',
          background: 'var(--bg-elevated)',
        }}
      >
        <Wand2 className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <span className="font-bold">
          {t('refactor.batchHint', {
            defaultValue: 'Apply across similar files',
          })}
        </span>
        <ChevronRight className="w-3 h-3 ml-auto" style={{ color: 'var(--fg-subtle)' }} />
      </button>
    </div>
  );
}

function ActionRow({ action }: { action: Action }) {
  const { t } = useTranslation('inspect');
  const [open, setOpen] = useState(false);
  const isAuto = action.tone === 'auto';
  const accent = isAuto ? 'var(--intent-success-fg)' : 'var(--intent-warn-fg)';
  const Icon = isAuto ? Check : ShieldAlert;

  const adds = action.diff.filter((l) => l.kind === '+').length;
  const dels = action.diff.filter((l) => l.kind === '-').length;

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 flex items-start gap-2">
        <Icon className="w-3 h-3 mt-0.5 shrink-0" style={{ color: accent }} />
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); }}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left transition-colors hover-surface rounded-md -mx-1 px-1"
        >
          <div
            className="text-[11px] font-bold leading-tight flex items-center gap-1"
            style={{ color: 'var(--fg-default)' }}
          >
            {action.title}
            <ChevronDown
              className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`}
              style={{ color: 'var(--fg-subtle)' }}
            />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs font-mono"
               style={{ color: 'var(--fg-subtle)' }}>
            <span>{action.delta}</span>
            <span className="opacity-50">·</span>
            <span>
              {t('refactor.confidence', {
                n: action.confidence,
                defaultValue: `conf ${action.confidence}%`,
              })}
            </span>
            <span className="opacity-50">·</span>
            <span style={{ color: action.blast > 5 ? 'var(--intent-warn-fg)' : undefined }}>
              {t('refactor.blast', {
                n: action.blast,
                defaultValue: `blast ${action.blast}`,
              })}
            </span>
            <span className="opacity-50">·</span>
            <span style={{ color: 'var(--intent-success-fg)' }}>+{adds}</span>
            <span style={{ color: 'var(--intent-danger-fg)' }}>−{dels}</span>
          </div>
        </button>
        <button
          type="button"
          className="shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] transition-colors hover-surface"
          style={{
            background: isAuto
              ? 'rgb(from var(--intent-success-vivid) r g b / 0.15)'
              : 'var(--bg-elevated)',
            color: isAuto ? 'var(--intent-success-fg)' : 'var(--fg-muted)',
          }}
        >
          {isAuto
            ? t('refactor.apply', { defaultValue: 'Apply' })
            : t('refactor.plan',  { defaultValue: 'Plan' })}
        </button>
      </div>

      {open && <DiffPreview diff={action.diff} />}
    </div>
  );
}

function DiffPreview({ diff }: { diff: DiffLine[] }) {
  return (
    <div
      className="mx-3 mb-2 rounded-md overflow-hidden text-[10px] font-mono leading-snug border"
      style={{
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-muted)',
      }}
    >
      {diff.map((line, i) => {
        const bg =
          line.kind === '+' ? 'rgb(from var(--intent-success-vivid) r g b / 0.10)' :
          line.kind === '-' ? 'rgb(from var(--intent-danger-vivid)  r g b / 0.10)' :
                              'transparent';
        const fg =
          line.kind === '+' ? 'var(--intent-success-fg)' :
          line.kind === '-' ? 'var(--intent-danger-fg)' :
                              'var(--fg-muted)';
        const sigil = line.kind === ' ' ? ' ' : line.kind;
        return (
          <div
            key={i}
            className="flex"
            style={{ background: bg, color: fg }}
          >
            <span
              className="shrink-0 w-5 text-center select-none"
              style={{
                opacity: line.kind === ' ' ? 0.35 : 0.85,
                background: line.kind !== ' '
                  ? (line.kind === '+'
                    ? 'rgb(from var(--intent-success-vivid) r g b / 0.18)'
                    : 'rgb(from var(--intent-danger-vivid)  r g b / 0.18)')
                  : 'transparent',
              }}
            >
              {sigil}
            </span>
            <span className="px-2 whitespace-pre overflow-x-auto">{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}
