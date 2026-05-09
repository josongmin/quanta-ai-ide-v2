import { Sparkles } from 'lucide-react';
import { GlassCard } from '@shared/ui';
import { useInvestigation } from '../model/InvestigationContext';

export default function InvestigateLauncher() {
  const { panelOpen, openPanel } = useInvestigation();
  if (panelOpen) return null;

  return (
    <div className="fixed top-3 right-3 z-30 pointer-events-auto">
      <GlassCard className="rounded-md">
        <button
          type="button"
          onClick={openPanel}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors hover:[background:var(--bg-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--fg-default)',
            cursor: 'pointer',
          }}
          title="Open investigation workspace"
        >
          <Sparkles
            className="w-3.5 h-3.5"
            style={{ color: 'var(--intent-success-vivid)' }}
          />
          Investigate
        </button>
      </GlassCard>
    </div>
  );
}
