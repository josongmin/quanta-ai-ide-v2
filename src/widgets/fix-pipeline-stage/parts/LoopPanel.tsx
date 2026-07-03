import type { TFunction } from 'i18next';
import type { LoopState } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';
import { describeReason } from '@features/fix-pipeline-loop';

type Props = {
  loop: LoopState;
  t: TFunction;
};

// Bounded-agent loop — show the iteration count and, when terminated,
// the *honest* reason. The spec is explicit that "stopped at iter N
// because critique repeated" beats a silent halt every time.
export function LoopPanel({ loop, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title={t('loop.header')}
        badge={`${loop.iteration.toString()}/${loop.maxIterations.toString()}`}
      />

      <div
        className="rounded-md px-2 py-2 mt-1.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
        }}
      >
        {!loop.terminated && (
          <div className="text-sm" style={{ color: 'var(--fg-default)' }}>
            {loop.iteration === 0 ? t('loop.idle') : t('loop.running')}
          </div>
        )}
        {loop.terminated && loop.reason !== null && (
          <>
            <div
              className="text-xs font-black uppercase tracking-eyebrow"
              style={{ color: 'var(--fg-subtle)' }}
            >
              {t('loop.terminated')}
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--fg-default)' }}>
              {describeReason(loop.reason)}
            </div>
          </>
        )}
      </div>
    </GlassCard>
  );
}
