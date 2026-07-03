import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useTabVisibility } from '@features/workspace-tabs';
import type { AgentTurn } from '../types';
import { useCodingStage } from '../../model/CodingStageContext';

export function TpsLiveMeter({
  turn,
}: {
  turn: AgentTurn;
}) {
  const { t } = useCodingStage();
  const [startedAt, setStartedAt] = useState<number>(0);
  const [now, setNow] = useState<number>(0);
  const visible = useTabVisibility();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) return;
    setStartedAt(Date.now());
    setNow(Date.now());
    const id = window.setInterval(() => { setNow(Date.now()); }, 900);
    return () => { window.clearInterval(id); };
  }, [visible]);
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
      className="flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono tabular-nums bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-default)]"
      title={t('tps.tooltip')}
    >
      <Zap className="w-2.5 h-2.5 coding-tps-live" />
      {tps}
      <span className="opacity-60">{t('tps.label')}</span>
    </span>
  );
}
