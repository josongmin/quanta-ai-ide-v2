// ProjectHeader — top strip with project label, status-dot counters,
// a "backgrounded · cloud" pill, and a "+" affordance for new queries.
// Anchors the queue to the broader project context the way Linear's
// left rail does.

import { Cloud, Plus } from 'lucide-react';
import { Popover } from '@shared/ui';
import type { PullRequest } from '@entities/pr';
import QueueBurndown from '../QueueBurndown';
import { DotPill } from './DotPill';
import { BackgroundMonitor } from './BackgroundMonitor';

export function ProjectHeader({
  prs, attention, critical, backgrounded, onJumpToPr,
}: {
  prs: PullRequest[];
  attention: number;
  critical: number;
  backgrounded: number;
  onJumpToPr: (n: number) => void;
}) {
  return (
    <div className="shrink-0 flex items-center gap-1.5 px-3 pt-3 pb-2 min-w-0">
      <div className="shrink-0 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55 leading-tight">
        프로젝트
      </div>
      {/* dot counters: critical (red) · attention (amber). Only render
          if non-zero so a clean queue isn't cluttered. */}
      <div className="flex items-center gap-1.5 shrink-0">
        {critical > 0 && (
          <DotPill tone="#c25a55" label={String(critical)} title={`${String(critical)} critical PR${critical === 1 ? '' : 's'}`} />
        )}
        {attention > 0 && (
          <DotPill tone="#d3b264" label={String(attention)} title={`${String(attention)} attention PR${attention === 1 ? '' : 's'}`} />
        )}
      </div>
      {/* 7-day burndown sparkline — DORA leading indicator. Hidden
          unless ≥3 PRs open, see QueueBurndown. */}
      <span className="min-w-0 shrink overflow-hidden">
        <QueueBurndown prs={prs} />
      </span>
      {/* Backgrounded — running CI / engine jobs. Click opens a popover
          with the actual jobs in flight (mini-monitor). Linear/Height
          ship the same affordance — it's the difference between "N
          things running" (anxiety) and "*these* things running" (info). */}
      {backgrounded > 0 && (
        <span className="ml-auto shrink-0">
          <Popover
            placement="anchor"
            align="end"
            width={320}
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-mono tabular-nums transition-colors hover:bg-[rgba(122,167,212,0.18)]"
                style={{
                  background: 'rgba(122,167,212,0.12)',
                  border: '1px solid rgba(122,167,212,0.35)',
                  color: 'var(--fg-default)',
                }}
                title={`진행 중인 백그라운드 작업 ${String(backgrounded)}개`}
              >
                <Cloud className="w-3 h-3" />
                {backgrounded}
              </button>
            )}
          >
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-strong)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              }}
            >
              <BackgroundMonitor prs={prs} onJumpToPr={onJumpToPr} />
            </div>
          </Popover>
        </span>
      )}
      <button
        type="button"
        aria-label="새 쿼리 추가"
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-white/45 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
        title="새 쿼리 추가"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
