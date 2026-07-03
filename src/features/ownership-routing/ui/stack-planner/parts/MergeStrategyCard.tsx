import type { MergeStrategyAdvice } from '@entities/ownership';
import { MERGE_STRATEGY_SHORT, MergeStrategyPill } from './primitives';

export function MergeStrategyCard({ advice }: { advice: MergeStrategyAdvice }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 border space-y-2"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-muted)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-2xs font-black uppercase tracking-[0.22em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Merge strategy
        </span>
        <span className="flex-1 h-px" style={{ background: 'var(--border-muted)' }} />
        <MergeStrategyPill strategy={advice.strategy} />
      </div>
      <p
        className="text-sm leading-snug"
        style={{ color: 'var(--fg-default)' }}
      >
        {advice.reason}
      </p>
      {advice.alternative && (
        <div
          className="rounded-md px-2.5 py-2 border"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-muted)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-2xs font-black uppercase tracking-[0.22em]"
              style={{ color: 'var(--fg-subtle)' }}
            >
              Alternative
            </span>
            <span
              className="text-2xs font-black uppercase tracking-eyebrow px-1.5 py-0.5 rounded-md"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }}
            >
              {MERGE_STRATEGY_SHORT[advice.alternative.strategy]}
            </span>
          </div>
          <p
            className="text-[10.5px] leading-snug italic"
            style={{ color: 'var(--fg-muted)' }}
          >
            {advice.alternative.reason}
          </p>
        </div>
      )}
    </div>
  );
}
