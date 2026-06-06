import { Sparkles } from 'lucide-react';
import type { InvestigationTarget } from '@entities/investigation';
import { useInvestigationRunner } from '../model/InvestigationContext';

type Props = {
  target: InvestigationTarget;
  onClick?: () => void;
};

export default function InvestigateCTA({ target, onClick }: Props) {
  const { start } = useInvestigationRunner();
  const handleClick = () => {
    start(target);
    onClick?.();
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors hover:[background:var(--bg-hover)]"
      style={{
        background: 'transparent',
        color: 'var(--fg-default)',
        cursor: 'pointer',
      }}
      title="Investigate"
    >
      <Sparkles
        className="w-3 h-3"
        style={{ color: 'var(--intent-success-vivid)' }}
      />
      Investigate
    </button>
  );
}
