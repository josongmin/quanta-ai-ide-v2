import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { PRDiff } from '@entities/repo';
import { type evaluateAdmission } from '@entities/admission';
import { SEVERITY_COLOR, useV2 } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { SmallStat } from './atoms';

// ─────────────────────────────────────────────────────────────────────────
// RETROACTIVE — bottom bars
// ─────────────────────────────────────────────────────────────────────────

export function Retroactive({
  retro,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  const t = useV2();
  const [hover, setHover] = useState<number | null>(null);
  const summary = useMemo(() => {
    let block = 0, warn = 0, pass = 0;
    for (const r of retro) {
      if (r.decision.outcome === 'block') block++;
      else if (r.decision.outcome === 'warn') warn++;
      else pass++;
    }
    return { block, warn, pass, total: retro.length };
  }, [retro]);

  const hovered = hover !== null ? retro[hover] : null;

  return (
    <V2Card className="p-5">
      <div className="flex items-center gap-3">
        <SectionTitle icon={Filter}>{tA('section.retroactive')}</SectionTitle>
        <div className="flex-1" />
        <SmallStat label="block" value={summary.block} color={SEVERITY_COLOR.block} />
        <SmallStat label="warn"  value={summary.warn}  color={SEVERITY_COLOR.warn} />
        <SmallStat label="pass"  value={summary.pass}  color={t.ok} />
      </div>

      <div className="relative mt-4 flex items-end gap-px h-16">
        {retro.map((r, i) => {
          const accent = r.decision.outcome === 'block' ? SEVERITY_COLOR.block
            : r.decision.outcome === 'warn' ? SEVERITY_COLOR.warn
            : t.ok;
          const fired = r.decision.ruleResults.filter((rr) => rr.status === 'block' || rr.status === 'warn').length;
          const h = 18 + Math.min(82, fired * 12);
          const isHover = hover === i;
          return (
            <div
              key={r.seed}
              role="presentation"
              onMouseEnter={() => { setHover(i); }}
              onMouseLeave={() => { setHover((v) => (v === i ? null : v)); }}
              className="relative flex-1 rounded-t-sm transition-all cursor-pointer"
              style={{
                height: `${h}%`,
                background: `linear-gradient(to top, ${accent}cc, ${accent}33)`,
                opacity: isHover ? 1 : 0.85,
                transform: isHover ? 'scaleY(1.08)' : 'none',
                transformOrigin: 'bottom',
                boxShadow: r.decision.outcome === 'block' ? `0 -2px 10px ${accent}55` : 'none',
              }}
            >
              {isHover && (
                <div
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg whitespace-nowrap admv2-rise"
                  style={{
                    background: t.cardBacking,
                    border: `1px solid ${accent}88`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 16px ${accent}44`,
                  }}
                >
                  <div className="text-[10px] font-mono" style={{ color: t.textBody }}>#{r.seed}</div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    {r.decision.outcome}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: t.textSubtle }}>
                    {fired} rules fired
                  </div>
                  <div
                    aria-hidden
                    className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-2 h-2 rotate-45"
                    style={{
                      background: t.cardBacking,
                      borderRight: `1px solid ${accent}88`,
                      borderBottom: `1px solid ${accent}88`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] font-mono" style={{ color: t.textFaint }}>
        <span>30d ago</span>
        <span>{hovered ? `#${hovered.seed} · ${hovered.decision.outcome.toUpperCase()}` : 'height = rules fired'}</span>
        <span>now</span>
      </div>
    </V2Card>
  );
}
