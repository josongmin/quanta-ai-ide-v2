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
  const border = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]';
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';

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
          <ProjectChip project={project} isDark={isDark} />
          <span className={textFaint}>/</span>
          <StatusBadge status={task.status} isDark={isDark} />
          <span className={`text-[13px] font-semibold truncate ${textPrimary}`}>
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
                className={`flex items-center gap-1.5 text-[11px] font-mono ${toneClass} ${pulseClass} px-1.5 py-0.5`}
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
                    className="px-1 py-px rounded-sm text-[9px] font-bold uppercase tracking-[0.16em] border"
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
          <span className={`flex items-center gap-1 text-[11px] font-mono ${textMuted}`}>
            <GitBranch className="w-3 h-3" />
            {task.branch}
            <span className={textFaint}>← {task.baseBranch}</span>
          </span>
          <span className={textFaint}>·</span>
          <button type="button" className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${
            isDark ? 'text-white/55 hover:text-white hover:bg-white/[0.05]' : 'text-black/55 hover:text-black hover:bg-black/[0.05]'
          }`}>
            <GitPullRequest className="w-3 h-3" />
            {t('header.openPr')}
          </button>
          <button
            type="button"
            aria-label="More options"
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.05]' : 'text-black/40 hover:text-black/85 hover:bg-black/[0.05]'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        {task.thread.length === 0 ? (
          <EmptyState project={project} isDark={isDark} t={t} />
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
        className={`shrink-0 border-t ${border} ${isDark ? 'bg-[#0b0d10]/85' : 'bg-white/70'} backdrop-blur ${
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

function ProjectChip({ project, isDark }: { project: Project; isDark: boolean }) {
  const accent = ACCENT_HEX[project.accent];
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-md font-mono text-[9px] font-bold"
        style={{
          background: `${accent}20`,
          color: accent,
          boxShadow: `inset 0 0 0 1px ${accent}38`,
        }}
      >
        {project.initial}
      </span>
      <span className={`text-[12px] font-semibold ${isDark ? 'text-white/70' : 'text-black/70'}`}>
        {project.name}
      </span>
    </div>
  );
}

function StatusBadge({ status, isDark }: { status: Task['status']; isDark: boolean }) {
  const tone = isDark
    ? 'text-white/70 bg-white/[0.06] border-white/[0.10]'
    : 'text-black/65 bg-black/[0.05] border-black/[0.10]';
  const dot = `${isDark ? 'bg-white/55' : 'bg-black/50'}${status === 'running' ? ' animate-pulse' : ''}`;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border ${tone}`}>
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function EmptyState({
  project,
  isDark,
  t,
}: {
  project: Project;
  isDark: boolean;
  t: TranslateFn;
}) {
  const accent = ACCENT_HEX[project.accent];
  const textPrimary = isDark ? 'text-white/85' : 'text-black/85';
  const textMuted = isDark ? 'text-white/40' : 'text-black/55';
  const textFaint = isDark ? 'text-white/30' : 'text-black/40';
  const card = isDark
    ? 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.12]'
    : 'bg-black/[0.015] hover:bg-black/[0.03] border-black/[0.06] hover:border-black/[0.14]';

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
          <span className="font-mono text-[18px] font-bold" style={{ color: accent }}>
            {project.initial}
          </span>
        </div>
        <h2 className={`text-[15px] font-semibold mb-1 ${textPrimary}`}>
          {t('empty.title')}
        </h2>
        <p className={`text-[12px] ${textMuted} mb-2`}>
          {t('empty.subtitle')}
        </p>
        <p className={`text-[11px] font-mono ${textFaint} mb-8`}>
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
                <span className={`text-[12px] font-semibold ${textPrimary}`}>
                  {t(`suggestion.${key}.title`)}
                </span>
              </div>
              <div className={`text-[11px] leading-relaxed ${textMuted} line-clamp-2`}>
                {t(`suggestion.${key}.body`)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
