import { ArrowUpRight } from 'lucide-react';
import type { PRDiff } from '@entities/repo';
import {
  type evaluateAdmission,
  type AdmissionRule, type RuleSource,
} from '@entities/admission';
import { SEVERITY_COLOR, useV2, type V2Theme } from '../tokens';
import { RETRO_SEEDS } from '../retrospective';

// Count — inline label/value pair used in the hero counter strip.
export function Count({ label, value, color, t }: { label: string; value: number; color?: string; t: V2Theme }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span
        className="text-[18px] font-semibold tabular-nums"
        style={{ color: color ?? t.textBody }}
      >
        {value}
      </span>
      <span
        className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: t.textSubtle }}
      >
        {label}
      </span>
    </div>
  );
}

export function FilterChips({
  value, onChange, rules,
}: {
  value: RuleSource | 'all';
  onChange: (v: RuleSource | 'all') => void;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div className="flex items-center gap-px rounded-md overflow-hidden" style={{ background: t.inset }}>
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className="px-2 py-1 text-[10px] font-mono transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textBody; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o}
            <span className="ml-1 opacity-60 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FeedRow({
  seed, diff, decision, index,
}: {
  seed: number;
  diff: PRDiff;
  decision: ReturnType<typeof evaluateAdmission>;
  index: number;
}) {
  const t = useV2();
  const accent = decision.outcome === 'block' ? SEVERITY_COLOR.block
    : decision.outcome === 'warn' ? SEVERITY_COLOR.warn
    : t.ok;

  const fired = decision.ruleResults.filter((r) => r.status === 'block' || r.status === 'warn');
  const topRule = fired.length > 0 ? fired[0].ruleName : null;

  // Real metrics for the row: counts come from the actual PR diff and
  // decision rather than placeholder copy, so each row shows the same
  // shape an engineer would see in a real review feed.
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
    <button
      type="button"
      className="w-full px-3 py-2 rounded-lg flex items-center gap-3 group transition-all hover:translate-x-0.5 text-left"
      style={{
        border: `1px solid ${t.borderSoft}`,
        animationDelay: `${index * 35}ms`,
        background: 'transparent',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Status dot — replaces the old left strip. The outer ring is a
          soft halo (only visible for block/warn) so the severity reads at
          a glance without the heavy bar the user disliked. */}
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
          <span className="text-[11px] font-mono" style={{ color: t.textBody }}>#{seed}</span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {decision.outcome}
          </span>
          <span className="ml-auto text-[9px] font-mono tabular-nums" style={{ color: t.textFaint }}>
            {ageLabel} ago
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono truncate" style={{ color: t.textMuted }}>
          <span className="tabular-nums shrink-0">
            {filesChanged} files
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="tabular-nums shrink-0">
            {rippleCount} ripple
          </span>
          <span style={{ color: t.textFaint }}>·</span>
          <span className="tabular-nums shrink-0" style={{ color: fired.length > 0 ? accent : t.textFaint }}>
            {fired.length} fired
          </span>
        </div>
        {topRule && (
          <div className="mt-0.5 text-[10px] font-mono truncate" style={{ color: t.textFaint }}>
            {topRule}{fired.length > 1 ? ` +${fired.length - 1}` : ''}
          </div>
        )}
      </div>
      <ArrowUpRight className="w-3 h-3 group-hover:rotate-12 shrink-0 transition-all" style={{ color: t.textFaint }} />
    </button>
  );
}

export function SmallStat({ label, value, color }: { label: string; value: number; color: string }) {
  const t = useV2();
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[16px] font-black tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: t.textSubtle }}>{label}</span>
    </div>
  );
}

export function Footer() {
  const t = useV2();
  return (
    <div className="text-center text-[10px] font-mono pt-2" style={{ color: t.textFaint }}>
      admission · v2 · all data synthetic
    </div>
  );
}
