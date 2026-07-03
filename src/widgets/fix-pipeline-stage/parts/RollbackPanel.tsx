import type { TFunction } from 'i18next';
import type { RollbackPackage } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  rollback: RollbackPackage;
  t: TFunction;
};

// Rollback package — Phase 2 (pulled forward from Phase 3). Auto-submit
// without a rollback path is irresponsible; this panel shows the revert
// plan that ships *with* every guarded/auto-submitted PR.
export function RollbackPanel({ rollback, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('rollback.header')} />

      <div className="mt-2">
        <div
          className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('rollback.commit')}
        </div>
        <pre
          className="text-xs font-mono px-2 py-1.5 rounded-md whitespace-pre-wrap"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-default)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <code>{rollback.revertCommitMessage}</code>
        </pre>
      </div>

      <div className="mt-2">
        <div
          className="text-2xs font-black uppercase tracking-eyebrow mb-0.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('rollback.steps')}
        </div>
        <ol className="flex flex-col gap-0.5">
          {rollback.steps.map((s, i) => (
            <li
              key={`s-${i.toString()}`}
              className="text-xs"
              style={{ color: 'var(--fg-default)' }}
            >
              {(i + 1).toString()}. {s}
            </li>
          ))}
        </ol>
      </div>
    </GlassCard>
  );
}
