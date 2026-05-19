import {
  useEffect, useState, type ComponentType, type MouseEvent, type ReactNode,
} from 'react';
import {
  Cpu, FileCode, GitFork, Heart, RotateCcw, Sparkles, Target,
  ThumbsDown, ThumbsUp, Zap,
} from 'lucide-react';
import { formatNumber } from '@shared/lib';
import { BlockView } from './Blocks';
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
        <div className="px-3 py-2.5 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed bg-[color:var(--bg-elevated)] text-[color:var(--fg-strong)]">
          <div className="whitespace-pre-wrap break-words">{turn.text}</div>
          {turn.mentions && turn.mentions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {turn.mentions.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-[color:var(--bg-active)] text-[color:var(--fg-default)]"
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
        <div className="mt-1 text-right text-[10px] font-mono text-[color:var(--fg-subtle)]">
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
          <span className="text-[11px] font-semibold text-[color:var(--fg-strong)]">
            agent
          </span>
          <span className={`text-[10px] font-mono ${faint}`}>{turn.at}</span>
          {modelLabel && (
            <span
              className="flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-muted)]"
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
                className={`flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${toneClass}`}
                title={turn.confidenceRationale ?? t('selfEval.tooltip')}
              >
                <Target className="w-2.5 h-2.5" />
                {label}
              </span>
            );
          })()}
          {turn.streaming && (
            <span className="flex items-center gap-1 px-1.5 py-px rounded-full text-[9px] font-mono bg-[color:var(--bg-elevated)] text-[color:var(--fg-default)]">
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
              className="flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono"
              title={t('inverse.anchor')}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              {t('inverse.anchor')}
            </span>
          )}
          {!turn.streaming && turn.tokens && (
            <span className={`flex items-center gap-2 ml-auto text-[10px] font-mono ${muted}`}>
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

function TpsLiveMeter({
  turn,
  t,
}: {
  turn: AgentTurn;
  t: TranslateFn;
}) {
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setStartedAt(Date.now());
    setNow(Date.now());
    const id = window.setInterval(() => { setNow(Date.now()); }, 900);
    return () => { window.clearInterval(id); };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const elapsedMs = Math.max(1, now - startedAt);
  const tokensSoFar = turn.blocks.reduce((sum, b) => {
    if (b.kind === 'thinking') return sum + 240;
    if (b.kind === 'plan') return sum + 180;
    if (b.kind === 'diff') return sum + 320;
    if (b.kind === 'text') return sum + 110;
    if (b.kind === 'tool') return sum + 45;
    return sum + 60;
  }, 0);
  const tps = Math.max(0, Math.round((tokensSoFar / elapsedMs) * 1000));

  return (
    <span
      className="flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono tabular-nums bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-default)]"
      title={t('tps.tooltip')}
    >
      <Zap className="w-2.5 h-2.5 coding-tps-live" />
      {tps}
      <span className="opacity-60">{t('tps.label')}</span>
    </span>
  );
}

const LATENCY_PHASE_TONE: Record<string, string> = {
  thinking: 'var(--identity-out-of-scope)',
  reading: 'var(--intent-info-fg)',
  searching: 'var(--identity-out-of-scope)',
  editing: 'var(--intent-success-fg)',
  running: 'var(--intent-warn-fg)',
  planning: 'var(--intent-danger-fg)',
  writing: 'var(--intent-info-fg)',
};

function LatencyBar({
  durations,
  baseline,
  t,
}: {
  durations: NonNullable<AgentTurn['phaseDurationsMs']>;
  baseline?: Record<string, number>;
  t: TranslateFn;
}) {
  const entries = Object.entries(durations).filter((e): e is [string, number] => e[1] != null && e[1] > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, ms]) => s + ms, 0);
  const muted = 'text-[color:var(--fg-subtle)]';
  let baselineChip: ReactNode = null;

  if (baseline != null) {
    let baseTotal = 0;
    let cmpTotal = 0;
    for (const [phase, ms] of entries) {
      const b = baseline[phase];
      if (b != null && b > 0) {
        baseTotal += b;
        cmpTotal += ms;
      }
    }
    if (baseTotal > 0 && cmpTotal > 0) {
      const ratio = cmpTotal / baseTotal;
      const isMatch = ratio >= 0.85 && ratio <= 1.15;
      const toneClass = isMatch ? muted : '';
      const toneStyle: React.CSSProperties | undefined = isMatch
        ? undefined
        : ratio < 1
          ? { color: 'var(--intent-success-fg)' }
          : { color: 'var(--intent-warn-fg)' };
      const x = (ratio < 1 ? 1 / ratio : ratio).toFixed(1);
      const label = isMatch
        ? t('latencyBaseline.match')
        : ratio < 1 ? t('latencyBaseline.faster', { x }) : t('latencyBaseline.slower', { x });
      baselineChip = (
        <span
          style={toneStyle}
          className={`shrink-0 text-[9px] font-mono tabular-nums ${toneClass}`}
          title={t('latencyBaseline.tooltip')}
        >
          {label}
        </span>
      );
    }
  }

  return (
    <div
      className="mt-1.5 flex items-center gap-2"
      title={t('latency.tooltip')}
      aria-label={t('latency.label')}
    >
      <div className="flex-1 coding-latency-bar">
        {entries.map(([phase, ms]) => {
          const pct = (ms / total) * 100;
          const tone = LATENCY_PHASE_TONE[phase] ?? 'var(--fg-muted)';
          return (
            <span
              key={phase}
              style={{ width: `${pct}%`, background: tone }}
              title={`${t(`phase.${phase}`)} · ${ms}ms (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <span className={`shrink-0 text-[9px] font-mono tabular-nums ${muted}`}>
        {t('latency.totalLabel', { ms: total })}
      </span>
      {baselineChip}
    </div>
  );
}

function CitationStrip({
  citations,
  t,
}: {
  citations: NonNullable<AgentTurn['citations']>;
  t: TranslateFn;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? citations : citations.slice(0, 3);
  const overflow = citations.length - visible.length;
  const muted = 'text-[color:var(--fg-subtle)]';
  const chip = 'bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-default)]';

  return (
    <div className="mb-2 flex items-center gap-1.5 flex-wrap">
      <span className={`text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] ${muted}`}>
        {t('citations.label')}
      </span>
      {visible.map((c, i) => {
        const basename = c.path.split('/').pop() ?? c.path;
        const range = c.lines
          ? t('citations.lines', { start: c.lines[0], end: c.lines[1] })
          : t('citations.noLines');
        const isStale = c.staleAfterTurn != null;
        const fullTitle = [
          c.path,
          c.lines ? `L${c.lines[0]}-${c.lines[1]}` : null,
          c.note,
          isStale ? t('citationStale.tooltip') : null,
        ].filter(Boolean).join(' · ');
        const staleChipStyle: React.CSSProperties = {
          borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)',
          background: 'var(--intent-warn-bg)',
          color: 'var(--intent-warn-fg)',
        };
        return (
          <span
            key={`${c.path}:${i}`}
            title={fullTitle}
            className={`inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[10px] font-mono cursor-help ${chip} ${
              isStale ? 'opacity-75' : ''
            }`}
          >
            <FileCode className="w-2.5 h-2.5 opacity-70" />
            <span className={isStale ? 'line-through opacity-80' : ''}>{basename}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-70">{range}</span>
            {isStale && (
              <span
                style={staleChipStyle}
                className="ml-0.5 px-1 rounded-sm text-2xs font-bold uppercase tracking-[var(--track-eyebrow)] border"
              >
                {t('citationStale.label')}
              </span>
            )}
          </span>
        );
      })}
      {overflow > 0 && !expanded && (
        <button
          type="button"
          onClick={() => { setExpanded(true); }}
          className={`text-[10px] font-mono underline ${muted}`}
        >
          {t('citations.more', { count: overflow })}
        </button>
      )}
    </div>
  );
}

function ReactionBar({
  reactions,
  onReact,
  t,
}: {
  reactions: AgentTurn['reactions'];
  onReact: (kind: ReactionKind) => void;
  t: TranslateFn;
}) {
  const items: { kind: ReactionKind; Icon: ComponentType<{ className?: string; fill?: string }>; toneStyle: React.CSSProperties }[] = [
    { kind: 'thumbsUp', Icon: ThumbsUp, toneStyle: { color: 'var(--intent-success-fg)', background: 'color-mix(in srgb, var(--intent-success-vivid) 15%, transparent)' } },
    { kind: 'thumbsDown', Icon: ThumbsDown, toneStyle: { color: 'var(--intent-danger-fg)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)' } },
    { kind: 'heart', Icon: Heart, toneStyle: { color: 'var(--intent-danger-fg)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 15%, transparent)' } },
    { kind: 'target', Icon: Target, toneStyle: { color: 'var(--intent-warn-fg)', background: 'color-mix(in srgb, var(--intent-warn-vivid) 15%, transparent)' } },
  ];
  const idle = 'text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-default)] hover:bg-[color:var(--bg-hover)]';

  return (
    <div className="mt-2 flex items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity">
      {items.map(({ kind, Icon, toneStyle }) => {
        const active = reactions?.[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => { onReact(kind); }}
            title={t(`reactions.${kind}`)}
            aria-label={t(`reactions.${kind}`)}
            aria-pressed={!!active}
            style={active ? toneStyle : undefined}
            className={`p-1 rounded transition-colors ${active ? '' : idle}`}
          >
            <Icon className="w-3 h-3" fill={active ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[color:var(--fg-subtle)] animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
