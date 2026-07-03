import { useState } from 'react';
import { Radio, Beaker, Clock, FileWarning, Network } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';

// Blast radius simulator — answers "what happens if I touch this file?"
// without anyone touching anything. Toggling the simulation flips the
// box into an active state that breaks down the cost of a hypothetical
// edit into the four things engineers actually fear: which files
// invalidate, which tests must rerun, how long the recompute takes,
// and which reviewers wake up. The numbers are derived from blastRadius
// + fanIn + churn so they stay coherent across files; production wires
// this to the engine's real impact analyzer.

export function BlastRadiusBox({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const [armed, setArmed] = useState(false);
  const m = file.metrics;

  // Synthetic-but-coherent impact model:
  //   files            = blastRadius
  //   tests rerun      ≈ 60% of blast (capped)
  //   typecheck files  ≈ blast capped at 40
  //   recompute (ms)   ≈ 12 + log2(1+blast) * 22
  //   reviewers        = ceil(authors / 2)  (heuristic for ownership)
  const blast = m.blastRadius;
  const testsRerun = Math.min(blast, Math.round(blast * 0.6));
  const typecheck = Math.min(40, blast);
  const recomputeMs = Math.round(12 + Math.log2(1 + blast) * 22);
  const reviewers = Math.max(1, Math.ceil(m.authors / 2));

  // Severity rolls up to the worst of {tests, recompute, blast}
  const severity =
    blast > 30 || recomputeMs > 200 ? 'high' :
    blast > 10 || recomputeMs > 80  ? 'medium' :
                                      'low';

  const sevColor =
    severity === 'high'   ? 'var(--intent-danger-fg)' :
    severity === 'medium' ? 'var(--intent-warn-fg)' :
                            'var(--intent-success-fg)';
  const sevLabel =
    severity === 'high'   ? t('blast.severity.high',   { defaultValue: 'High impact' }) :
    severity === 'medium' ? t('blast.severity.medium', { defaultValue: 'Moderate' }) :
                            t('blast.severity.low',    { defaultValue: 'Low impact' });

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors"
      style={{
        background: armed
          ? 'rgb(from var(--intent-warn-vivid) r g b / 0.08)'
          : 'var(--bg-surface-muted)',
        borderColor: armed
          ? 'rgb(from var(--intent-warn-vivid) r g b / 0.30)'
          : 'var(--border-default)',
      }}
    >
      {/* Header + toggle */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <Radio
          className={`w-3 h-3 ${armed ? 'animate-pulse' : ''}`}
          style={{ color: armed ? sevColor : 'var(--fg-subtle)' }}
        />
        <div
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: armed ? sevColor : 'var(--fg-subtle)' }}
        >
          {t('blast.title', { defaultValue: 'Blast radius' })}
        </div>

        {armed && (
          <span
            className="text-2xs font-black uppercase tracking-eyebrow"
            style={{ color: sevColor }}
          >
            · {sevLabel}
          </span>
        )}

        <button
          type="button"
          onClick={() => { setArmed((v) => !v); }}
          aria-pressed={armed}
          className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-2xs font-black uppercase tracking-eyebrow transition-colors hover-surface"
          style={{
            background: armed
              ? sevColor
              : 'var(--bg-elevated)',
            color: armed ? '#0a0d12' : 'var(--fg-muted)',
          }}
        >
          <Beaker className="w-2.5 h-2.5" />
          {armed
            ? t('blast.disarm', { defaultValue: 'Stop sim' })
            : t('blast.arm',    { defaultValue: 'Simulate' })}
        </button>
      </div>

      {/* Idle state — single explanatory line so the box doesn't look hollow */}
      {!armed && (
        <div
          className="px-3 pb-2.5 text-xs leading-relaxed"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('blast.idleHint', {
            n: blast,
            defaultValue: `${blast} downstream files would invalidate. Press Simulate for the full cost breakdown.`,
          })}
        </div>
      )}

      {/* Armed state — full impact breakdown */}
      {armed && (
        <>
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            <ImpactCell
              icon={<FileWarning className="w-2.5 h-2.5" />}
              label={t('blast.invalidate', { defaultValue: 'Invalidate' })}
              value={blast.toString()}
              sub={t('focus.filesUnit', { defaultValue: 'files' })}
              tone={blast > 30 ? 'danger' : blast > 10 ? 'warn' : undefined}
            />
            <ImpactCell
              icon={<Beaker className="w-2.5 h-2.5" />}
              label={t('blast.testsRerun', { defaultValue: 'Tests rerun' })}
              value={testsRerun.toString()}
              sub="≈"
              tone={testsRerun > 20 ? 'warn' : undefined}
            />
            <ImpactCell
              icon={<Network className="w-2.5 h-2.5" />}
              label={t('blast.typecheck', { defaultValue: 'Typecheck' })}
              value={typecheck.toString()}
              sub={t('focus.filesUnit', { defaultValue: 'files' })}
            />
            <ImpactCell
              icon={<Clock className="w-2.5 h-2.5" />}
              label={t('blast.recompute', { defaultValue: 'Recompute' })}
              value={`${recomputeMs}ms`}
              sub="incremental"
              tone={recomputeMs > 200 ? 'warn' : undefined}
            />
          </div>

          {/* Reviewer + plan footer */}
          <div
            className="px-3 py-2 border-t flex items-center gap-2 text-xs"
            style={{
              borderColor: 'var(--border-muted)',
              background: 'var(--bg-elevated)',
              color: 'var(--fg-muted)',
            }}
          >
            <span className="font-bold">
              {t('blast.reviewers', {
                n: reviewers,
                defaultValue: `~${reviewers} reviewers`,
              })}
            </span>
            <span className="opacity-50">·</span>
            <span style={{ color: 'var(--fg-subtle)' }}>
              {t('blast.plan', {
                defaultValue: 'Hypothetical — no files were modified',
              })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function ImpactCell({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'warn' | 'danger';
}) {
  const valueColor =
    tone === 'danger' ? 'var(--intent-danger-fg)' :
    tone === 'warn'   ? 'var(--intent-warn-fg)' :
                        'var(--fg-default)';
  return (
    <div>
      <div
        className="flex items-center gap-1 text-2xs font-black uppercase tracking-eyebrow"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className="text-base font-mono font-bold tabular-nums"
          style={{ color: valueColor }}
        >
          {value}
        </span>
        <span
          className="text-2xs font-mono"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {sub}
        </span>
      </div>
    </div>
  );
}
