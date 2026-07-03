import { Wand2, Hourglass } from 'lucide-react';
import type { FixCase } from '../../model/types';
import { ACCENT, SUCCESS, DANGER, NEUTRAL, mix } from './tokens';

export function Header({ stage }: { stage: FixCase['loop']['currentStage'] }) {
  const stageLabel: Record<string, string> = {
    investigate: 'Investigating',
    patch: 'Drafting candidates',
    validate: 'Validating',
    critique: 'Self-critique',
    package: 'Packaging',
    done: 'Ready',
    aborted: 'Human checkpoint',
  };
  const stageColor =
    stage === 'done' ? SUCCESS
      : stage === 'aborted' ? DANGER
      : stage === 'validate' || stage === 'critique' ? ACCENT
      : NEUTRAL;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-default)]">
      <Wand2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
      <span className="text-xs font-black uppercase tracking-eyebrow text-[var(--fg-default)]">
        Verified Fix Pipeline
      </span>
      <span
        className="ml-auto inline-flex items-center gap-1.5 px-2 h-5 rounded text-2xs font-mono uppercase tracking-eyebrow"
        style={{ background: mix(stageColor, 11), color: stageColor, border: `1px solid ${mix(stageColor, 33)}` }}
      >
        {stage === 'validate' || stage === 'critique'
          ? <Hourglass className="w-2.5 h-2.5 animate-pulse" />
          : null}
        {stageLabel[stage] ?? stage}
      </span>
    </div>
  );
}
