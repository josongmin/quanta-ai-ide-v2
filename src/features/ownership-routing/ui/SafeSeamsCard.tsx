import type { CSSProperties } from 'react';
import { GlassCard, SectionHeader, EmptyHint } from '@shared/ui';
import type { SafeSeamCandidate } from '@entities/ownership';

export interface SafeSeamsCardProps {
  seams: SafeSeamCandidate[];
}

function StatusBadge({ status }: { status: SafeSeamCandidate['status'] }): JSX.Element {
  const detected = status === 'detected';
  const style: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    color: detected ? 'var(--intent-success-fg)' : 'var(--fg-subtle)',
    border: detected ? '1px solid var(--border-muted)' : '1px dashed var(--border-muted)',
  };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em] flex-none"
      style={style}
    >
      {detected ? 'DETECTED' : 'SLOT'}
    </span>
  );
}

export function SafeSeamsCard(props: SafeSeamsCardProps): JSX.Element {
  const { seams } = props;
  const detectedCount = seams.filter((s) => s.status === 'detected').length;

  return (
    <GlassCard className="rounded-xl p-3">
      <SectionHeader title="Safe seams" badge={`${detectedCount} detected`} />

      <div
        className="mt-1 mb-2 rounded-md px-2.5 py-1.5 border flex items-center gap-2"
        style={{
          background: 'var(--bg-surface-muted)',
          borderColor: 'var(--border-muted)',
          borderStyle: 'dashed',
        }}
      >
        <span
          className="text-[8px] font-black uppercase tracking-[0.22em] px-1.5 py-0.5 rounded"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          Phase 3
        </span>
        <span
          className="text-[10.5px] leading-snug"
          style={{ color: 'var(--fg-muted)' }}
        >
          Detected seams come from import-graph + behavior-diff. Slots are reserved for future auto-detection.
        </span>
      </div>

      {seams.length === 0 ? (
        <EmptyHint text="No safe seams identified yet." />
      ) : (
        <>
          <ul className="flex flex-col gap-1.5 mt-1">
            {seams.map((s) => {
              const isSlot = s.status === 'placeholder';
              const rowStyle: CSSProperties = {
                background: 'var(--bg-surface-muted)',
                border: isSlot ? '1px dashed var(--border-muted)' : '1px solid var(--border-muted)',
                opacity: isSlot ? 0.7 : 1,
              };
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 rounded-lg px-2 py-1.5"
                  style={rowStyle}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden
                      className="font-mono text-[10px] flex-none"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      ├──
                    </span>
                    <span
                      className={`font-mono text-[11px] truncate flex-1 min-w-0 ${
                        isSlot ? 'italic' : ''
                      }`}
                      style={{ color: isSlot ? 'var(--fg-muted)' : 'var(--fg-default)' }}
                      title={s.module}
                    >
                      {isSlot ? 'manual hint — AI has not identified this yet' : s.module}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <div
                    className="text-[11px] leading-snug pl-[26px]"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {s.reason}
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            className="mt-2.5 pt-2 text-[10px] leading-snug border-t"
            style={{ color: 'var(--fg-subtle)', borderColor: 'var(--border-muted)' }}
          >
            Detected seams come from import-graph + behavior-diff. Slots are reserved for future
            auto-detection.
          </div>
        </>
      )}
    </GlassCard>
  );
}
