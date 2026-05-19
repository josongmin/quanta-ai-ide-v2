import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PRDiff } from '@entities/repo';
import { type evaluateAdmission } from '@entities/admission';
import { useV2 } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { FeedRow } from './atoms';

// ─────────────────────────────────────────────────────────────────────────
// LIVE FEED — right column, vertical streaming list with shimmer
// ─────────────────────────────────────────────────────────────────────────

export function LiveFeed({
  retro,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  // Newest first — synthetic stream reads top-down.
  const ordered = useMemo(() => [...retro].reverse(), [retro]);
  return (
    <V2Card className="p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle icon={Clock}>{tA('section.livePrFeed')}</SectionTitle>
        <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-mono" style={{ color: t.textSubtle }}>
          <span className="w-1.5 h-1.5 rounded-full admv2-blink" style={{ background: t.ok }} />
          live
        </span>
      </div>
      <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 540 }}>
        {ordered.slice(0, 12).map((r, i) => (
          <FeedRow key={r.seed} index={i} seed={r.seed} diff={r.diff} decision={r.decision} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t text-[10px] font-mono leading-relaxed" style={{ borderColor: t.borderSoft, color: t.textSubtle }}>
        Synthetic stream · current ruleset replayed against deterministic seeds.
      </div>
    </V2Card>
  );
}
