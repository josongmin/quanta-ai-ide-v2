import { useMemo } from 'react';
import { useTranslation } from '@shared/i18n';
import { ArrowUpRight, Clock } from 'lucide-react';
import type { PRDiff } from '@entities/repo';
import { type evaluateAdmission } from '@entities/admission';
import { SEVERITY_COLOR } from '../tokens';
import { V2Card, SectionTitle } from '../primitives';
import { RETRO_SEEDS } from '../retrospective';

// ─────────────────────────────────────────────────────────────────────────
// LIVE FEED — right column, vertical streaming list with shimmer
// ─────────────────────────────────────────────────────────────────────────

export function LiveFeed({
  retro,
}: {
  retro: { seed: number; diff: PRDiff; decision: ReturnType<typeof evaluateAdmission> }[];
}) {
  const { t: tA } = useTranslation('admission');
  // Newest first — synthetic stream reads top-down.
  const ordered = useMemo(() => [...retro].reverse(), [retro]);
  return (
    <V2Card className="p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <SectionTitle icon={Clock}>{tA('section.livePrFeed')}</SectionTitle>
        <span className="ml-1 inline-flex items-center gap-1 text-[9px] font-mono text-[var(--fg-subtle)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--intent-success-vivid)] admv2-blink" />
          live
        </span>
      </div>
      <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 540 }}>
        {ordered.slice(0, 12).map((r, i) => (
          <FeedRow key={r.seed} index={i} seed={r.seed} diff={r.diff} decision={r.decision} />
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--border-muted)] text-[10px] font-mono text-[var(--fg-subtle)] leading-relaxed">
        Synthetic stream · current ruleset replayed against deterministic seeds.
      </div>
    </V2Card>
  );
}

function FeedRow({
  seed, diff, decision, index,
}: {
  seed: number;
  diff: PRDiff;
  decision: ReturnType<typeof evaluateAdmission>;
  index: number;
}) {
  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : 'var(--intent-success-vivid)';

  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const topRule = fired.length > 0 ? fired[0].ruleName : null;

  // Real metrics for the row.
  const filesChanged = diff.changes.length;
  const rippleCount = diff.affected.length;
  // Deterministic relative time per seed — newer seeds = more recent.
  const ageMin = (RETRO_SEEDS[RETRO_SEEDS.length - 1] - seed) * 47 + index * 3;
  const ageLabel = ageMin < 60
    ? `${ageMin}m`
    : ageMin < 1440
      ? `${Math.floor(ageMin / 60)}h`
      : `${Math.floor(ageMin / 1440)}d`;

  return (
    <div
      className="px-3 py-2 rounded-lg flex items-center gap-3 group transition-all hover:bg-[var(--bg-hover)] hover:translate-x-0.5"
      style={{
        border: '1px solid var(--border-muted)',
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Status dot */}
      <span className="relative shrink-0 inline-flex items-center justify-center w-3 h-3">
        {decision.outcome !== 'allow' && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: accent,
              opacity: 0.18,
              filter: 'blur(2px)',
            }}
          />
        )}
        <span
          className="relative w-1.5 h-1.5 rounded-full"
          style={{
            background: accent,
            boxShadow: decision.outcome === 'block' ? `0 0 0 2px ${accent}33` : 'none',
          }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--fg-default)]">#{seed}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[var(--track-eyebrow)]"
            style={{ color: accent }}
          >
            {decision.outcome}
          </span>
          <span className="ml-auto text-[9px] font-mono text-[var(--fg-subtle)] tabular-nums">
            {ageLabel} ago
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-[var(--fg-muted)] truncate">
          <span className="tabular-nums shrink-0">
            {filesChanged} files
          </span>
          <span className="text-[var(--fg-subtle)]">·</span>
          <span className="tabular-nums shrink-0">
            {rippleCount} ripple
          </span>
          <span className="text-[var(--fg-subtle)]">·</span>
          <span className="tabular-nums shrink-0" style={{ color: fired.length > 0 ? accent : 'var(--fg-subtle)' }}>
            {fired.length} fired
          </span>
        </div>
        {topRule && (
          <div className="mt-0.5 text-[10px] font-mono text-[var(--fg-subtle)] truncate">
            {topRule}{fired.length > 1 ? ` +${fired.length - 1}` : ''}
          </div>
        )}
      </div>
      <ArrowUpRight className="w-3 h-3 text-[var(--fg-subtle)] group-hover:text-[var(--fg-default)] group-hover:rotate-12 shrink-0 transition-all" />
    </div>
  );
}
