import { useEffect, useMemo, useRef } from 'react';
import {
  Activity, CheckCircle2, Coins, GitBranch, GitPullRequest, MoreHorizontal, Sparkles,
} from 'lucide-react';
import { formatNumber } from '@shared/lib';
import { Composer, type ComposerModelId } from '../Composer';
import { LiveSnapshotCard } from '../timeline/LiveSnapshotCard';
import { TimelineScrubber } from '../timeline/TimelineScrubber';
import { TurnView } from '../turn/TurnViews';
import type { AgentTurn, Project, ReactionKind, Task, Turn } from '../types';

type TranslateFn = (k: string, opts?: Record<string, unknown>) => string;

export const ACCENT_HEX = {
  emerald: '#a1a1aa',
  sky: '#a1a1aa',
  violet: '#a1a1aa',
  amber: '#a1a1aa',
  rose: '#a1a1aa',
  cyan: '#a1a1aa',
} as const;

export function ThreadPane({
  task,
  project,
  isDark,
  draft,
  onDraftChange,
  onSubmit,
  onStop,
  intent,
  onIntent,
  isStreaming,
  t,
  model,
  onModelChange,
  onSaveProjectDefaultModel,
  promptHistory,
  visibleThread,
  scrubHead,
  onScrub,
  isScrubbed,
  onApplyInverse,
  onFork,
  onReact,
  onOpenTurnMenu,
  cost,
}: {
  task: Task;
  project: Project;
  isDark: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  intent: 'code' | 'ask';
  onIntent: (v: 'code' | 'ask') => void;
  isStreaming: boolean;
  t: TranslateFn;
  model: ComposerModelId;
  onModelChange: (id: ComposerModelId) => void;
  onSaveProjectDefaultModel: () => void;
  promptHistory: string[];
  visibleThread: Turn[];
  scrubHead: number | null;
  onScrub: (idx: number | null) => void;
  isScrubbed: boolean;
  onApplyInverse: (turnId: string) => void;
  onFork: (turnId: string) => void;
  onReact: (turnId: string, kind: ReactionKind) => void;
  onOpenTurnMenu: (x: number, y: number, turn: Turn) => void;
  cost: { inTok: number; outTok: number; usd: number; avgUsd: number };
}) {
  const border = 'border-[color:var(--border-muted)]';
  const textPrimary = 'text-[color:var(--fg-strong)]';
  const textMuted = 'text-[color:var(--fg-muted)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';

  const scrollRef = useRef<HTMLDivElement>(null);
  const tailLen = task.thread[task.thread.length - 1]?.role === 'agent'
    ? (task.thread[task.thread.length - 1] as AgentTurn).blocks.length
    : 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [task.id, task.thread.length, tailLen]);

  const baselinePhaseDurations = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const tn of task.thread) {
      if (tn.role !== 'agent' || tn.phaseDurationsMs == null) continue;
      for (const [phase, ms] of Object.entries(tn.phaseDurationsMs)) {
        if (ms == null || ms <= 0) continue;
        sums[phase] = sums[phase] ?? { total: 0, count: 0 };
        sums[phase].total += ms;
        sums[phase].count += 1;
      }
    }
    const avg: Record<string, number> = {};
    for (const [phase, { total, count }] of Object.entries(sums)) {
      if (count > 0) avg[phase] = total / count;
    }
    return avg;
  }, [task.thread]);

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className={`shrink-0 h-12 flex items-center justify-between px-5 border-b ${border}`}>
        <div className="flex items-center gap-2 min-w-0">
          <ProjectChip project={project} />
          <span className={textFaint}>/</span>
          <StatusBadge status={task.status} />
          <span className={`text-md font-semibold truncate ${textPrimary}`}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(cost.inTok + cost.outTok > 0) && (() => {
            const budget = project.budget;
            let toneStyle: React.CSSProperties | undefined;
            let toneClass = textMuted;
            let badge: string | null = null;
            let pulseClass = '';

            if (budget?.hardCapUsd != null && cost.usd >= budget.hardCapUsd) {
              toneStyle = { color: 'var(--intent-danger-fg)' };
              toneClass = '';
              badge = t('budgetV2.tier.hardCap');
              pulseClass = 'coding-cost-hard';
            } else if (budget?.softCapUsd != null && cost.usd >= budget.softCapUsd) {
              toneStyle = { color: 'var(--intent-danger-fg)' };
              toneClass = '';
              badge = t('budgetV2.tier.softCap');
              pulseClass = 'coding-cost-hard';
            } else if (budget?.alertUsd != null && cost.usd >= budget.alertUsd) {
              toneStyle = { color: 'var(--intent-warn-fg)' };
              toneClass = '';
              badge = t('budgetV2.tier.alert');
              pulseClass = 'coding-cost-alert';
            }

            return (
              <span
                style={toneStyle}
                className={`flex items-center gap-1.5 text-sm font-mono ${toneClass} ${pulseClass} px-1.5 py-0.5`}
                title={t('cost.tooltip')}
              >
                <Coins className="w-3 h-3" />
                <span className="tabular-nums">{formatNumber(cost.inTok + cost.outTok)}</span>
                <span className={textFaint}>{t('cost.tokensShort')}</span>
                <span className={textFaint}>·</span>
                <span className="tabular-nums">
                  {t('cost.estimate')} ${cost.usd.toFixed(cost.usd < 0.01 ? 4 : cost.usd < 1 ? 3 : 2)}
                </span>
                {badge != null && (
                  <span
                    style={badge === t('budget.exceeded')
                      ? { borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 40%, transparent)', background: 'color-mix(in srgb, var(--intent-danger-vivid) 10%, transparent)' }
                      : { borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)', background: 'color-mix(in srgb, var(--intent-warn-vivid) 10%, transparent)' }}
                    className="px-1 py-px rounded-sm text-2xs font-bold uppercase tracking-eyebrow border"
                  >{badge}</span>
                )}
                {cost.avgUsd > 0 && (
                  <span className={`${textFaint} tabular-nums`}>· {t('projection.label')} ${cost.avgUsd.toFixed(3)}</span>
                )}
                {isStreaming && cost.avgUsd > 0 && (
                  <span className={`${textFaint} tabular-nums`} title={t('forecast.tooltip')}>
                    · {t('forecast.remaining', { usd: cost.avgUsd.toFixed(3) })}
                  </span>
                )}
              </span>
            );
          })()}
          {(cost.inTok + cost.outTok > 0) && <span className={textFaint}>·</span>}
          <span className={`flex items-center gap-1 text-sm font-mono ${textMuted}`}>
            <GitBranch className="w-3 h-3" />
            {task.branch}
            <span className={textFaint}>← {task.baseBranch}</span>
          </span>
          <span className={textFaint}>·</span>
          <button type="button" className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-mono transition-colors text-[color:var(--fg-muted)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]">
            <GitPullRequest className="w-3 h-3" />
            {t('header.openPr')}
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-1 rounded-md transition-colors text-[color:var(--fg-subtle)] hover:text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-hover)]"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {task.thread.length === 0 ? (
          <EmptyState project={project} t={t} />
        ) : (
          <div className="max-w-[760px] mx-auto px-6 py-6 space-y-6">
            {visibleThread.map((turn) => (
              <TurnView
                key={turn.id}
                turn={turn}
                isDark={isDark}
                t={t}
                onApplyInverse={() => { onApplyInverse(turn.id); }}
                onFork={() => { onFork(turn.id); }}
                onReact={(kind) => { onReact(turn.id, kind); }}
                onContextMenu={(x, y) => { onOpenTurnMenu(x, y, turn); }}
                baselinePhaseDurationsMs={baselinePhaseDurations}
              />
            ))}
            {!isStreaming && !isScrubbed && task.thread[task.thread.length - 1]?.role === 'agent' && (
              <LiveSnapshotCard
                task={task}
                isDark={isDark}
                t={t}
                onContinue={() => { onDraftChange(t('snapshot.continue') + ': '); }}
              />
            )}
          </div>
        )}
      </div>

      {task.thread.length >= 2 && (
        <div className="shrink-0">
          <TimelineScrubber
            turns={task.thread}
            headIdx={scrubHead}
            onScrub={onScrub}
            isDark={isDark}
            t={t}
            onApplyInverse={(targetIdx) => {
              const turn = task.thread[targetIdx];
              if (turn != null) onApplyInverse(turn.id);
              onScrub(null);
            }}
          />
        </div>
      )}

      <div
        id="coding-composer"
        className={`shrink-0 border-t ${border} bg-[var(--bg-surface)] ${isDark ? 'backdrop-blur' : ''} ${
          isScrubbed ? 'opacity-60 pointer-events-none' : ''
        }`}
      >
        <div className="max-w-[760px] mx-auto px-6 py-4">
          <Composer
            draft={draft}
            onChange={onDraftChange}
            onSubmit={onSubmit}
            onStop={onStop}
            intent={intent}
            onIntent={onIntent}
            isDark={isDark}
            t={t}
            isStreaming={isStreaming}
            branch={task.branch}
            baseBranch={task.baseBranch}
            model={model}
            onModelChange={onModelChange}
            onSaveProjectDefaultModel={onSaveProjectDefaultModel}
            history={promptHistory}
          />
        </div>
      </div>
    </section>
  );
}

function ProjectChip({ project }: { project: Project }) {
  const accent = ACCENT_HEX[project.accent];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-md font-mono text-2xs font-bold"
        style={{
          background: `${accent}20`,
          color: accent,
          boxShadow: `inset 0 0 0 1px ${accent}38`,
        }}
      >
        {project.initial}
      </span>
      <span className="text-base font-semibold text-[color:var(--fg-default)]">
        {project.name}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: Task['status'] }) {
  const tone = 'text-[color:var(--fg-default)] bg-[color:var(--bg-elevated)] border-[color:var(--border-default)]';
  const dot = `bg-[color:var(--fg-muted)]${status === 'running' ? ' animate-pulse' : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-xs font-bold uppercase tracking-eyebrow border ${tone}`}>
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function EmptyState({
  project,
  t,
}: {
  project: Project;
  t: TranslateFn;
}) {
  const accent = ACCENT_HEX[project.accent];
  const textPrimary = 'text-[color:var(--fg-strong)]';
  const textMuted = 'text-[color:var(--fg-muted)]';
  const textFaint = 'text-[color:var(--fg-subtle)]';
  const card = 'bg-[color:var(--bg-surface-muted)] hover:bg-[color:var(--bg-hover)] border-[color:var(--border-muted)] hover:border-[color:var(--border-strong)]';

  const presets = [
    { key: 'fixFlaky', icon: Activity },
    { key: 'addTests', icon: CheckCircle2 },
    { key: 'refactor', icon: Sparkles },
    { key: 'review', icon: GitPullRequest },
  ] as const;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <div className="max-w-[600px] w-full text-center">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
          style={{
            background: `${accent}1f`,
            boxShadow: `inset 0 0 0 1px ${accent}33, 0 8px 32px -8px ${accent}55`,
          }}
        >
          <span className="font-mono text-2xl font-bold" style={{ color: accent }}>
            {project.initial}
          </span>
        </div>
        <h2 className={`text-[15px] font-semibold mb-1 ${textPrimary}`}>
          {t('empty.title')}
        </h2>
        <p className={`text-base ${textMuted} mb-2`}>
          {t('empty.subtitle')}
        </p>
        <p className={`text-sm font-mono ${textFaint} mb-8`}>
          {project.slug}
        </p>

        <div className="grid grid-cols-2 gap-2 text-left">
          {presets.map(({ key, icon: Icon }) => (
            <button
              type="button"
              key={key}
              className={`rounded-lg border ${card} px-3 py-2.5 transition-all duration-150`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${textFaint}`} />
                <span className={`text-base font-semibold ${textPrimary}`}>
                  {t(`suggestion.${key}.title`)}
                </span>
              </div>
              <div className={`text-sm leading-relaxed ${textMuted} line-clamp-2`}>
                {t(`suggestion.${key}.body`)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
