import { useTranslation } from 'react-i18next';
import type { RefactorStack } from '@entities/ownership';
import { MergeStrategyPill } from './primitives';

function AiPill() {
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-2xs font-black uppercase tracking-[0.22em] shrink-0"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      AI
    </span>
  );
}

export function RationaleStrip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <AiPill />
      <p
        className="text-base leading-snug italic line-clamp-2"
        style={{
          color: 'var(--fg-muted)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={text}
      >
        {text}
      </p>
    </div>
  );
}

function MetaCell({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span
        className="text-2xs font-black uppercase tracking-eyebrow truncate"
        style={{ color: 'var(--fg-muted)' }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1 min-w-0">
        <span
          className="text-lg font-bold tabular-nums leading-none truncate"
          style={{ color: 'var(--fg-strong)' }}
        >
          {value}
        </span>
        {sublabel && (
          <span
            className="text-xs tabular-nums leading-none"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function PlanMeta({ stack }: { stack: RefactorStack }) {
  const { t } = useTranslation('ownership');
  const confidencePct = Math.round(stack.splitConfidence * 100);
  const confidenceColor =
    stack.splitConfidence >= 0.7
      ? 'var(--intent-success-fg)'
      : stack.splitConfidence >= 0.4
        ? 'var(--intent-warn-fg)'
        : 'var(--intent-danger-fg)';
  return (
    <div className="flex items-stretch gap-3 flex-wrap">
      <MergeStrategyPill strategy={stack.mergeStrategy} />
      <span
        className="self-stretch w-px"
        style={{ background: 'var(--border-muted)' }}
        aria-hidden
      />
      <MetaCell
        label={t('stack.estimate')}
        value={`~${stack.totalEstimatedDays}`}
        sublabel={t('stack.dayUnit', { count: stack.totalEstimatedDays })}
      />
      <MetaCell
        label={t('stack.steps')}
        value={String(stack.steps.length)}
        sublabel={t('stack.stepUnit', { count: stack.steps.length })}
      />
      <span
        className="self-stretch w-px"
        style={{ background: 'var(--border-muted)' }}
        aria-hidden
      />
      <div
        className="flex flex-col gap-0.5 min-w-0"
        title={t('stack.splitConfidenceTitle', {
          basis: stack.splitConfidenceBasis.join(' · '),
        })}
      >
        <span
          className="text-2xs font-black uppercase tracking-eyebrow"
          style={{ color: 'var(--fg-muted)' }}
        >
          {t('stack.splitConfidence')}
        </span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-lg font-bold tabular-nums leading-none"
            style={{ color: confidenceColor }}
          >
            {confidencePct}
          </span>
          <span
            className="text-xs tabular-nums leading-none"
            style={{ color: 'var(--fg-subtle)' }}
          >
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function SplitConfidenceBasis({ basis }: { basis: string[] }) {
  const { t } = useTranslation('ownership');
  if (basis.length === 0) return null;
  return (
    <div>
      <div
        className="text-2xs font-black uppercase tracking-[0.22em] mb-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {t('stack.whyConfidence')}
      </div>
      <ul className="space-y-0.5">
        {basis.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-1.5 text-sm leading-snug"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span
              className="inline-block mt-[5px] w-1 h-1 rounded-full shrink-0"
              style={{ background: 'var(--fg-subtle)' }}
              aria-hidden
            />
            <span className="flex-1 min-w-0">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
