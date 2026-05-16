import type { CSSProperties, JSX } from 'react';
import { GlassCard, SectionHeader, StackedRatioBar, EmptyHint } from '@shared/ui';
import type { ProofObligation } from '@entities/ownership';

export type ProofObligationsCardProps = {
  obligations: ProofObligation[];
}

type Status = ProofObligation['status'];

const STATUS_COLOR: Record<Status, string> = {
  satisfied: 'var(--intent-success-vivid)',
  pending: 'var(--intent-warn-vivid)',
  unknown: 'var(--intent-danger-vivid)',
  placeholder: 'var(--fg-subtle)',
};

const STATUS_FG: Record<Status, string> = {
  satisfied: 'var(--intent-success-fg)',
  pending: 'var(--intent-warn-fg)',
  unknown: 'var(--intent-danger-fg)',
  placeholder: 'var(--fg-subtle)',
};

const STATUS_LABEL: Record<Status, string> = {
  satisfied: 'SATISFIED',
  pending: 'PENDING',
  unknown: 'UNKNOWN',
  placeholder: 'SLOT',
};

function StatusDot({ status }: { status: Status }): JSX.Element {
  if (status === 'placeholder') {
    return (
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: 10,
          height: 10,
          border: '1px dashed var(--fg-subtle)',
          background: 'transparent',
          flex: '0 0 auto',
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block rounded-full"
      style={{
        width: 10,
        height: 10,
        background: STATUS_COLOR[status],
        flex: '0 0 auto',
      }}
    />
  );
}

function PhasePreviewBanner({ phase, text }: { phase: string; text: string }) {
  return (
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
        Phase {phase}
      </span>
      <span
        className="text-[10.5px] leading-snug"
        style={{ color: 'var(--fg-muted)' }}
      >
        {text}
      </span>
    </div>
  );
}

export function ProofObligationsCard(props: ProofObligationsCardProps): JSX.Element {
  const { obligations } = props;
  const total = obligations.length;
  const satisfiedCount = obligations.filter((o) => o.status === 'satisfied').length;
  const pendingCount = obligations.filter((o) => o.status === 'pending').length;
  const unknownCount = obligations.filter((o) => o.status === 'unknown').length;
  const placeholderCount = obligations.filter((o) => o.status === 'placeholder').length;

  return (
    <GlassCard className="rounded-xl p-3">
      <SectionHeader title="Proof obligations" badge={`${satisfiedCount}/${total}`} />

      <PhasePreviewBanner
        phase="3"
        text="Proof obligations are derived from your codebase — slots below are reserved for future auto-detection."
      />

      {total === 0 ? (
        <EmptyHint text="No proof obligations recorded for this stack." />
      ) : (
        <>
          <div className="mt-1 mb-2.5">
            <StackedRatioBar
              total={total}
              segments={[
                { key: 'satisfied', n: satisfiedCount, hue: STATUS_COLOR.satisfied },
                { key: 'pending', n: pendingCount, hue: STATUS_COLOR.pending },
                { key: 'unknown', n: unknownCount, hue: STATUS_COLOR.unknown },
                { key: 'placeholder', n: placeholderCount, hue: STATUS_COLOR.placeholder },
              ]}
            />
            <div
              className="flex items-center gap-3 mt-1.5 text-[9px] tracking-[0.14em] uppercase font-semibold"
              style={{ color: 'var(--fg-subtle)' }}
            >
              <LegendDot color={STATUS_COLOR.satisfied} text={`Sat ${satisfiedCount}`} />
              <LegendDot color={STATUS_COLOR.pending} text={`Pen ${pendingCount}`} />
              <LegendDot color={STATUS_COLOR.unknown} text={`Unk ${unknownCount}`} />
              <LegendDot color={STATUS_COLOR.placeholder} text={`Slot ${placeholderCount}`} dashed />
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {obligations.map((o) => {
              const isSlot = o.status === 'placeholder';
              const rowStyle: CSSProperties = {
                background: 'var(--bg-surface-muted)',
                border: isSlot ? '1px dashed var(--border-muted)' : '1px solid var(--border-muted)',
                opacity: isSlot ? 0.7 : 1,
              };
              return (
                <li
                  key={o.id}
                  className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                  style={rowStyle}
                >
                  <div className="pt-[3px]">
                    <StatusDot status={o.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[9px] font-bold tracking-[0.18em]"
                      style={{ color: STATUS_FG[o.status] }}
                    >
                      {STATUS_LABEL[o.status]}
                    </div>
                    <div
                      className={`text-[12px] font-semibold ${isSlot ? 'italic' : ''}`}
                      style={{ color: isSlot ? 'var(--fg-muted)' : 'var(--fg-default)' }}
                    >
                      {isSlot ? 'future input — AI not yet able to derive' : o.label}
                    </div>
                    {o.detail && (
                      <div
                        className="text-[11px] leading-snug mt-0.5"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        {o.detail}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </GlassCard>
  );
}

function LegendDot({
  color,
  text,
  dashed = false,
}: {
  color: string;
  text: string;
  dashed?: boolean;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: dashed ? 'transparent' : color,
          border: dashed ? `1px dashed ${color}` : 'none',
        }}
      />
      {text}
    </span>
  );
}
