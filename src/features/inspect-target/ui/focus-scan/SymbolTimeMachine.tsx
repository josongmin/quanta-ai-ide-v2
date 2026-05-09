import { useMemo } from 'react';
import { History, GitCommit, Zap } from 'lucide-react';
import type { FileRecord } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { symbolEvolution } from './symbolHistory';

// Symbol-level Time Machine — git × graph × AST fusion.
//
// Where `git log` shows file-level commit history and Sourcegraph shows
// AST-level *current* state, this card shows the *evolution* of one
// symbol's complexity over the past N commits that touched it. The
// sparkline flags the single PR that introduced the largest jump in
// cyclomatic — the equivalent of a bisect target — so the user can
// click straight from "this function feels gnarly" to "this PR did
// it." Production swaps the synthetic ticks for joined index + git
// data; layout stays the same.

export function SymbolTimeMachine({ file }: { file: FileRecord }) {
  const { t } = useTranslation('inspect');
  const ticks = useMemo(() => symbolEvolution(file), [file]);

  const W = 280;
  const H = 56;
  const padX = 6;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const maxCyc = Math.max(8, ...ticks.map((tk) => tk.cyclomatic));
  const xAt = (i: number) =>
    padX + (i / Math.max(1, ticks.length - 1)) * innerW;
  const yAt = (cyc: number) =>
    padY + innerH - (cyc / maxCyc) * innerH;

  const linePath = ticks
    .map((tk, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)} ${yAt(tk.cyclomatic).toFixed(2)}`)
    .join(' ');

  const jump = ticks.find((tk) => tk.isJump);
  const first = ticks[0];
  const last = ticks[ticks.length - 1];

  // Trend label: positive delta (green = good for cyc → lower) is
  // the "improving" case. We're flipping the sign deliberately because
  // for cyclomatic, lower is better.
  const delta = last && first ? last.cyclomatic - first.cyclomatic : 0;
  const trendLabel =
    delta > 0 ? t('timeMachine.trendUp', { defaultValue: 'getting hairier' })
              : delta < 0 ? t('timeMachine.trendDown', { defaultValue: 'getting cleaner' })
                          : t('timeMachine.trendFlat', { defaultValue: 'stable' });
  const trendColor =
    delta > 5  ? 'var(--intent-danger-fg)'
              : delta > 0 ? 'var(--intent-warn-fg)'
                          : delta < 0 ? 'var(--intent-success-fg)'
                                      : 'var(--fg-subtle)';

  if (ticks.length === 0) return null;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <History className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('timeMachine.title', { defaultValue: 'Symbol time machine' })}
        </div>
        <span
          className="ml-auto text-[9px] font-black uppercase tracking-[0.16em]"
          style={{ color: trendColor }}
        >
          {delta > 0 ? '+' : ''}{delta} cyc · {trendLabel}
        </span>
      </div>

      {/* Sparkline */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        style={{ height: 56 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid baseline at maxCyc/2 */}
        <line
          x1={padX} y1={yAt(maxCyc / 2)} x2={W - padX} y2={yAt(maxCyc / 2)}
          stroke="var(--border-muted)" strokeWidth={0.5} strokeDasharray="2 3"
        />

        {/* Trend line */}
        <path
          d={linePath}
          stroke="var(--fg-default)"
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Tick dots */}
        {ticks.map((tk, i) => (
          <circle
            key={tk.prId}
            cx={xAt(i)}
            cy={yAt(tk.cyclomatic)}
            r={tk.isJump ? 3.2 : 1.6}
            fill={tk.isJump ? 'var(--intent-danger-fg)' : 'var(--fg-muted)'}
            stroke={tk.isJump ? 'var(--bg-elevated)' : 'none'}
            strokeWidth={tk.isJump ? 0.8 : 0}
          />
        ))}

        {/* Jump marker — vertical guide */}
        {jump && (
          <line
            x1={xAt(ticks.indexOf(jump))} y1={padY}
            x2={xAt(ticks.indexOf(jump))} y2={H - padY}
            stroke="var(--intent-danger-fg)"
            strokeWidth={0.6}
            strokeDasharray="1 2"
            opacity={0.55}
          />
        )}
      </svg>

      {/* Bisect callout — points the user at the PR that introduced
          the jump. This is the "regression bisect" affordance. */}
      {jump && (
        <div
          className="px-3 py-2 border-t flex items-start gap-2"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <Zap className="w-3 h-3 mt-0.5 shrink-0"
               style={{ color: 'var(--intent-danger-fg)' }} />
          <div className="min-w-0 flex-1">
            <div
              className="text-[10px] font-bold leading-tight"
              style={{ color: 'var(--fg-default)' }}
            >
              {t('timeMachine.bisect.title', {
                defaultValue: 'Complexity jump',
              })}
            </div>
            <div className="mt-0.5 text-[9.5px] font-mono"
                 style={{ color: 'var(--fg-subtle)' }}>
              #{jump.prId} · {jump.author} · {jump.daysAgo}d ago
              <span className="opacity-60"> · </span>
              <span style={{ color: 'var(--intent-danger-fg)' }}>
                cyc → {jump.cyclomatic}
              </span>
            </div>
            <div
              className="mt-0.5 text-[9.5px] truncate italic"
              style={{ color: 'var(--fg-muted)' }}
            >
              {`“${jump.message}”`}
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.18em] transition-colors hover-surface"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('timeMachine.bisect.open', { defaultValue: 'Open PR' })}
          </button>
        </div>
      )}

      {/* Compact tick legend — last 4 commits inline */}
      <div
        className="px-3 py-2 border-t space-y-0.5"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div
          className="text-[8.5px] font-black uppercase tracking-[0.16em]"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {t('timeMachine.recent', { defaultValue: 'Recent commits' })}
        </div>
        {ticks.slice(-3).reverse().map((tk) => (
          <div
            key={tk.prId}
            className="flex items-center gap-1.5 text-[9.5px] font-mono"
            style={{ color: 'var(--fg-muted)' }}
          >
            <GitCommit className="w-2.5 h-2.5 shrink-0"
                       style={{ color: 'var(--fg-subtle)' }} />
            <span className="tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {tk.daysAgo}d
            </span>
            <span className="truncate flex-1">{tk.message}</span>
            <span
              className="tabular-nums shrink-0"
              style={{ color: tk.isJump ? 'var(--intent-danger-fg)' : 'var(--fg-subtle)' }}
            >
              cyc {tk.cyclomatic}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
