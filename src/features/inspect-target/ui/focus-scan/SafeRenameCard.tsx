import { useMemo } from 'react';
import { Edit3, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { safeRename, type RenameAxis } from './symbolHistory';

// Safe-rename confidence breakdown.
//
// Renaming a symbol is the move every engineer does dozens of times a
// day, and the move every IDE silently risks corrupting (string refs,
// dynamic dispatch, public API consumers). Instead of "Rename →
// fingers crossed," we surface the four axes our index can score and
// fold them into a single composite confidence number. The confidence
// model maps onto our app-wide `Confidence` enum so users see the same
// language ("EXACT / OVERAPPROX / UNKNOWN") as in the file header.

export function SafeRenameCard({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const result = useMemo(() => safeRename(file), [file]);

  const compositePct = Math.round(result.composite * 100);
  // Match the entity-level Confidence semantics so the colors and
  // verdict line up with everything else in the inspector.
  const verdictKey =
    result.composite >= 0.95 ? 'exact' :
    result.composite >= 0.75 ? 'overapprox' :
                               'unknown';
  const verdictLabel =
    verdictKey === 'exact'      ? t('safeRename.verdict.exact',      { defaultValue: 'EXACT' }) :
    verdictKey === 'overapprox' ? t('safeRename.verdict.overapprox', { defaultValue: 'OVERAPPROX' }) :
                                  t('safeRename.verdict.unknown',    { defaultValue: 'NEEDS REVIEW' });
  const verdictColor =
    verdictKey === 'exact'      ? 'var(--intent-success-fg)' :
    verdictKey === 'overapprox' ? 'var(--intent-warn-fg)' :
                                  'var(--intent-danger-fg)';

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <Edit3 className="w-3 h-3" style={{ color: verdictColor }} />
        <div
          className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('safeRename.title', { defaultValue: 'Safe-rename confidence' })}
        </div>
        <span
          className="ml-auto text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]"
          style={{ color: verdictColor }}
        >
          {verdictLabel}
        </span>
      </div>

      {/* Composite headline */}
      <div className="flex items-baseline gap-2 px-3 pt-2.5">
        <span
          className="text-[28px] font-black tabular-nums leading-none"
          style={{ color: verdictColor }}
        >
          {compositePct}%
        </span>
        <span
          className="text-[9px] font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('safeRename.compositeNote', {
            unsafe: result.unsafeCallsites,
            total: result.totalCallsites,
            defaultValue: `${result.unsafeCallsites}/${result.totalCallsites} callsites need review`,
          })}
        </span>
      </div>

      {/* Composite bar */}
      <div className="px-3 mt-2">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{
              width: `${compositePct}%`,
              background: verdictColor,
            }}
          />
        </div>
      </div>

      {/* Per-axis breakdown */}
      <div className="px-3 pt-3 pb-3 space-y-1.5">
        {result.axes.map((axis) => (
          <AxisRow key={axis.id} axis={axis} />
        ))}
      </div>

      {/* CTA — Rename action conditional on confidence */}
      <div
        className="px-3 py-2 border-t flex items-center gap-2"
        style={{
          borderColor: 'var(--border-muted)',
          background: 'var(--bg-elevated)',
        }}
      >
        {verdictKey === 'exact' ? (
          <ShieldCheck className="w-3 h-3"
                       style={{ color: 'var(--intent-success-fg)' }} />
        ) : (
          <ShieldAlert className="w-3 h-3" style={{ color: verdictColor }} />
        )}
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          {verdictKey === 'exact'
            ? t('safeRename.cta.exact', { defaultValue: 'Refactor engine will handle every callsite' })
            : verdictKey === 'overapprox'
              ? t('safeRename.cta.overapprox', { defaultValue: 'Diff preview recommended for risky callsites' })
              : t('safeRename.cta.unknown', { defaultValue: 'Manual review required — auto-rename disabled' })}
        </span>
        <button
          type="button"
          disabled={verdictKey === 'unknown'}
          className="ml-auto shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] transition-colors hover-surface disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: verdictKey === 'exact'
              ? 'rgb(from var(--intent-success-vivid) r g b / 0.15)'
              : 'var(--bg-elevated)',
            color: verdictKey === 'exact'
              ? 'var(--intent-success-fg)'
              : 'var(--fg-muted)',
          }}
        >
          {verdictKey === 'exact'
            ? t('safeRename.btn.rename', { defaultValue: 'Rename' })
            : t('safeRename.btn.preview', { defaultValue: 'Preview' })}
        </button>
      </div>
    </div>
  );
}

function AxisRow({ axis }: { axis: RenameAxis }) {
  const pct = Math.round(axis.score * 100);
  const tone =
    axis.score >= 0.90 ? 'good' :
    axis.score >= 0.70 ? 'warn' :
                         'bad';
  const color =
    tone === 'good' ? 'var(--intent-success-fg)' :
    tone === 'warn' ? 'var(--intent-warn-fg)'   :
                      'var(--intent-danger-fg)';

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[10px]">
        <span
          className="font-bold tracking-[0.04em]"
          style={{ color: 'var(--fg-default)' }}
        >
          {axis.label}
        </span>
        <span
          className="font-mono tabular-nums shrink-0"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="mt-0.5 h-px rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div
        className="mt-0.5 text-[9px] leading-snug"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {axis.detail}
      </div>
    </div>
  );
}
