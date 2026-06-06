import { Sparkles } from 'lucide-react';
import { GlassCard } from '@shared/ui';
import { FIXTURE_TARGETS } from '@entities/investigation';
import { useInvestigationRunner } from '../model/InvestigationContext';
import { useJobs } from '../jobs';

export default function InvestigateLauncher() {
  const { panelOpen, openPanel } = useInvestigationRunner();
  const { jobs } = useJobs();
  if (panelOpen) return null;

  const runningCount = jobs.filter((j) => j.status === 'running').length;

  return (
    <div className="fixed top-3 right-3 z-30 pointer-events-auto">
      <GlassCard className="rounded-md">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors hover:[background:var(--bg-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--fg-default)',
            cursor: 'pointer',
          }}
          title="Open investigation workspace"
          aria-label="Open investigation workspace"
        >
          <Sparkles
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--intent-success-vivid)' }}
          />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[11px] font-medium">Investigate</span>
            <span
              style={{ fontSize: 9, color: 'var(--fg-subtle)' }}
              className="font-mono whitespace-nowrap"
            >
              {FIXTURE_TARGETS.length} demo targets · {runningCount} jobs running
            </span>
          </span>
        </button>
      </GlassCard>
    </div>
  );
}
