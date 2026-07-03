import { type MouseEvent } from 'react';
import { Cpu, GitFork, RotateCcw, Sparkles, Target, Zap } from 'lucide-react';
import { formatNumber } from '@shared/lib';
import { BlockView } from './Blocks';
import { TpsLiveMeter } from './TpsLiveMeter';
import { LatencyBar } from './LatencyBar';
import { CitationStrip } from './CitationStrip';
import { ReactionBar } from './ReactionBar';
import { StreamingDots } from './StreamingDots';
import type { AgentTurn, ReactionKind, Turn, UserTurn } from '../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export function TurnView({
  turn,
  isDark,
  t,
  onApplyInverse,
  onFork,
  onReact,
  onContextMenu,
  baselinePhaseDurationsMs,
}: {
  turn: Turn;
  isDark: boolean;
  t: TranslateFn;
  onApplyInverse: () => void;
  onFork: () => void;
  onReact: (kind: ReactionKind) => void;
  onContextMenu: (x: number, y: number) => void;
  baselinePhaseDurationsMs?: Record<string, number>;
}) {
  function onCtx(e: MouseEvent) {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY);
  }

  if (turn.role === 'user') {
    return <div role="presentation" onContextMenu={onCtx}><UserTurnView turn={turn} /></div>;
  }

  return (
    <div role="presentation" onContextMenu={onCtx}>
      <AgentTurnView
        turn={turn}
        isDark={isDark}
        t={t}
        onApplyInverse={onApplyInverse}
        onFork={onFork}
        onReact={onReact}
        baselinePhaseDurationsMs={baselinePhaseDurationsMs}
      />
    </div>
  );
}

function UserTurnView({ turn }: { turn: UserTurn }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="px-3 py-2.5 rounded-2xl rounded-tr-sm text-md leading-relaxed bg-[color:var(--bg-elevated)] text-[color:var(--fg-strong)]">
          <div className="whitespace-pre-wrap break-words">{turn.text}</div>
          {turn.mentions && turn.mentions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {turn.mentions.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-xs bg-[color:var(--bg-active)] text-[color:var(--fg-default)]"
                >
                  <span className="text-[color:var(--fg-subtle)]">
                    {m.kind === 'file' ? '#' : '@'}
                  </span>
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1 text-right text-xs font-mono text-[color:var(--fg-subtle)]">
          {turn.at}
        </div>
      </div>
    </div>
  );
}

function AgentTurnView({
  turn,
  isDark,
  t,
  onApplyInverse,
  onFork,
  onReact,
  baselinePhaseDurationsMs,
}: {
  turn: AgentTurn;
  isDark: boolean;
  t: TranslateFn;
  onApplyInverse: () => void;
  onFork: () => void;
  onReact: (kind: ReactionKind) => void;
  baselinePhaseDurationsMs?: Record<string, number>;
}) {
  const muted = 'text-[color:var(--fg-muted)]';
  const faint = 'text-[color:var(--fg-subtle)]';
  const modelLabel = turn.model
    ? turn.model.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.')
    : null;
  const phaseLabel = turn.phase ? t(`phase.${turn.phase}`) : null;

  return (
    <div className="flex gap-3 relative group/turn">
      <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 bg-[color:var(--bg-active)] border border-[color:var(--border-default)]">
        <Sparkles className="w-3 h-3 text-[color:var(--fg-default)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-[color:var(--fg-strong)]">
            agent
          </span>
          <span className={`text-xs font-mono ${faint}`}>{turn.at}</span>
          {modelLabel && (
            <span
              className="flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-muted)]"
              title={turn.model}
            >
              <Cpu className="w-2.5 h-2.5" />
              {modelLabel}
            </span>
          )}
          {turn.confidence != null && (() => {
            const pct = Math.round(turn.confidence * 100);
            const toneStyle: React.CSSProperties = pct >= 85
              ? {
                  background: 'var(--intent-success-bg)',
                  color: 'var(--intent-success-fg)',
                  borderColor: 'color-mix(in srgb, var(--intent-success-vivid) 30%, transparent)',
                }
              : pct >= 60
                ? {}
                : {
                    background: 'var(--intent-warn-bg)',
                    color: 'var(--intent-warn-fg)',
                    borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
                  };
            const toneClass = pct >= 60 && pct < 85
              ? 'bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-muted)] border-[color:var(--border-default)]'
              : '';
            const label = pct >= 85 ? t('selfEval.high', { pct })
              : pct >= 60 ? t('selfEval.mid', { pct })
                : t('selfEval.low', { pct });
            return (
              <span
                style={toneStyle}
                className={`flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono border ${toneClass}`}
                title={turn.confidenceRationale ?? t('selfEval.tooltip')}
              >
                <Target className="w-2.5 h-2.5" />
                {label}
              </span>
            );
          })()}
          {turn.streaming && (
            <span className="flex items-center gap-1 px-1.5 py-px rounded-full text-2xs font-mono bg-[color:var(--bg-elevated)] text-[color:var(--fg-default)]">
              <span className="w-1 h-1 rounded-full coding-tps-live bg-[color:var(--fg-muted)]" />
              {phaseLabel ?? 'streaming'}
            </span>
          )}
          {turn.streaming && <TpsLiveMeter turn={turn} t={t} />}
          {turn.inverseOf && (
            <span
              style={{
                background: 'var(--intent-warn-bg)',
                color: 'var(--intent-warn-fg)',
                border: '1px solid color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
              }}
              className="flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono"
              title={t('inverse.anchor')}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {t('inverse.anchor')}
            </span>
          )}
          {!turn.streaming && turn.tokens && (
            <span className={`flex items-center gap-2 ml-auto text-xs font-mono ${muted}`}>
              <span className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5" />
                {formatNumber(turn.tokens.in)} in · {formatNumber(turn.tokens.out)} out
              </span>
              {turn.elapsed && (
                <span className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />
                  {turn.elapsed}
                </span>
              )}
            </span>
          )}
        </div>
        {!turn.streaming && turn.phaseDurationsMs != null && (
          <LatencyBar
            durations={turn.phaseDurationsMs}
            baseline={baselinePhaseDurationsMs}
            t={t}
          />
        )}
        {turn.citations && turn.citations.length > 0 && (
          <CitationStrip citations={turn.citations} t={t} />
        )}
        <div className="space-y-2">
          {turn.blocks.map((block, i) => (
            <BlockView key={i} block={block} isDark={isDark} />
          ))}
          {turn.streaming && turn.blocks.length === 0 && <StreamingDots />}
        </div>
        {!turn.streaming && turn.blocks.length > 0 && (
          <ReactionBar reactions={turn.reactions} onReact={onReact} t={t} />
        )}
      </div>
      {!turn.streaming && (
        <div className="absolute top-0 right-0 opacity-0 group-hover/turn:opacity-100 transition-opacity pointer-events-none group-hover/turn:pointer-events-auto">
          <div className="flex items-center gap-px rounded-md border shadow-lg bg-[var(--bg-elevated)] border-[color:var(--border-default)]">
            <button
              type="button"
              onClick={onApplyInverse}
              title={`${t('applyV2.inverse')} · ${t('applyV2.inverseTooltip')}`}
              aria-label={t('applyV2.inverse')}
              className="p-1.5 rounded-l-md transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onFork}
              title={t('checkpoint.forkFromHere')}
              aria-label={t('checkpoint.forkFromHere')}
              className="p-1.5 rounded-r-md transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
            >
              <GitFork className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
