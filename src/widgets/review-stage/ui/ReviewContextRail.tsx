import { useMemo } from 'react';
import {
  Activity, Bot, ChevronRight, FileCode, MessageSquare, ShieldAlert, type LucideIcon,
} from 'lucide-react';
import {
  computePrRisk, engineFindings, engineSummary, summariseChecks, summariseConversation,
  type EngineSeverity,
  type PullRequest,
  type RiskTier,
} from '@entities/pr';
import type { RepoData } from '@entities/repo';
import AttentionRailMini from './AttentionRailMini';
import {
  BranchSection,
  MergeActionsSection,
  ParticipantsSection,
  ReviewRailSection,
} from './ReviewContextSections';
import type { ReviewTabKey } from '../model/types';

export function ContextRail({
  pr,
  repo,
  onJump,
  severityColors,
  tierColors,
  sectionIds,
  sectionLabels,
}: {
  pr: PullRequest;
  repo: RepoData;
  onJump: (t: ReviewTabKey) => void;
  severityColors: Record<EngineSeverity, string>;
  tierColors: Record<RiskTier, string>;
  sectionIds: Record<ReviewTabKey, string>;
  sectionLabels: Record<string, string>;
}) {
  const findings = useMemo(() => engineFindings(pr, repo), [pr, repo]);
  const summary = useMemo(() => engineSummary(findings), [findings]);
  const ci = useMemo(() => summariseChecks(pr.checks), [pr.checks]);
  const threads = useMemo(() => summariseConversation(pr), [pr]);

  const jumps: { key: ReviewTabKey; label: string; count: number; tone: string; Icon: LucideIcon }[] = [
    {
      key: 'insights',
      label: 'Findings',
      count: findings.length,
      tone: summary.blocker > 0 ? severityColors.blocker : summary.high > 0 ? severityColors.high : 'var(--fg-muted)',
      Icon: Bot,
    },
    {
      key: 'risk',
      label: 'Risk profile',
      count: 0,
      tone: tierColors[computePrRisk(pr, repo).tier],
      Icon: ShieldAlert,
    },
    { key: 'files', label: 'Files', count: pr.files.length, tone: 'var(--fg-muted)', Icon: FileCode },
    {
      key: 'checks',
      label: 'CI checks',
      count: ci.required.failed,
      tone: ci.required.failed > 0 ? severityColors.blocker : 'var(--fg-muted)',
      Icon: Activity,
    },
    {
      key: 'activity',
      label: 'Threads',
      count: threads.length,
      tone: threads.length > 0 ? severityColors.medium : 'var(--fg-muted)',
      Icon: MessageSquare,
    },
  ];

  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-[var(--border-default)]">
        <span className="text-sm font-bold uppercase tracking-eyebrow text-[var(--fg-muted)]">
          PR context
        </span>
        <span className="ml-auto text-xs font-mono text-[var(--fg-subtle)]">#{pr.number}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
        <ReviewRailSection label="Jump to">
          <div className="grid grid-cols-1 gap-1">
            {jumps.map((j) => (
              <button
                key={j.key}
                type="button"
                onClick={() => { onJump(j.key); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                <j.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: j.tone }} />
                <span className="flex-1 text-base text-[var(--fg-muted)]">{j.label}</span>
                {j.count > 0 && (
                  <span
                    className="text-xs font-mono tabular-nums px-1.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${j.tone} 13%, transparent)`, color: j.tone }}
                  >
                    {j.count}
                  </span>
                )}
                <ChevronRight className="w-3 h-3 text-[var(--fg-subtle)]" />
              </button>
            ))}
          </div>
        </ReviewRailSection>

        <AttentionRailMini
          prNumber={pr.number}
          sectionIds={Object.values(sectionIds)}
          labels={sectionLabels}
          onJump={(id) => {
            const tab = (Object.entries(sectionIds).find(([, v]) => v === id)?.[0] ?? null) as ReviewTabKey | null;
            if (tab !== null) onJump(tab);
          }}
        />

        <ParticipantsSection pr={pr} />
        <BranchSection pr={pr} blockerColor={severityColors.blocker} />
        <MergeActionsSection pr={pr} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-[var(--border-default)] text-xs font-mono text-[var(--fg-subtle)]">
        @{pr.author} · #{pr.number}
      </div>
    </>
  );
}
