import { useMemo, useState } from 'react';
import { Wand2, Check, ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { ACTION_RULES, type Action, type DiffLine } from './refactorActions';

// Refactor-actions box — the "machine" face of the inspector. The legacy
// proposal list (RefactorBlock) advised the human; this box proposes
// concrete *patches* the engine can apply, each annotated with a
// confidence score and a blast radius. Two tiers visually:
//   1. Auto-apply candidates (green) — confidence ≥ 90, blast ≤ 2
//   2. Plan / review candidates  (amber) — anything else
// Each row shows the metric delta the patch achieves, so the user can
// judge value vs risk before clicking.
//
// The action catalog itself lives in refactorActions.ts as a data-driven
// registry; this component just maps the applicable rules to Actions, sorts,
// and renders.

export function RefactorActionsBox({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const m = file.metrics;

  // Heuristic action catalog. In production this comes from the engine's
  // patch proposer; here we synthesize stable suggestions per file based
  // on the metrics already present so the demo reads coherently.
  //
  // Memoised on `m` and `file.layer` so the rule filter/map + sort +
  // count below don't fire on every parent re-render (e.g. when the
  // panel's collapsed-state state changes).
  const { actions, autoCount, totalCount } = useMemo(() => {
    const out: Action[] = ACTION_RULES
      .filter((rule) => rule.when(m, file))
      .map((rule) => rule.build(m, file, t));

    // Sort: auto first (confidence desc), then review (confidence desc).
    out.sort((a, b) => {
      if (a.tone !== b.tone) return a.tone === 'auto' ? -1 : 1;
      return b.confidence - a.confidence;
    });

    let auto = 0;
    for (const a of out) if (a.tone === 'auto') auto += 1;
    return { actions: out, autoCount: auto, totalCount: out.length };
  }, [m, file, t]);

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
