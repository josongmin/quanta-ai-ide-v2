import { GitPullRequest, ShieldAlert, ShieldCheck, ShieldX, Sparkles } from 'lucide-react';
import type { PRDiff } from '@entities/repo';
import { type evaluateAdmission } from '@entities/admission';
import { SEVERITY_COLOR, useV2, type V2Theme } from '../tokens';
import { V2Card } from '../primitives';

// ─────────────────────────────────────────────────────────────────────────
// HERO — verdict aurora, ticker counters, scanning line
// ─────────────────────────────────────────────────────────────────────────

export function Hero({
  decision, diff, seed, onRegenerate,
}: {
  decision: ReturnType<typeof evaluateAdmission>;
  diff: PRDiff;
  seed: number;
  onRegenerate: () => void;
}) {
  const t = useV2();
  const outcome = decision.outcome;
  const accent = outcome === 'block' ? SEVERITY_COLOR.block
    : outcome === 'warn' ? SEVERITY_COLOR.warn
    : 'var(--intent-success-vivid)';
  const Icon = outcome === 'allow' ? ShieldCheck : outcome === 'warn' ? ShieldAlert : ShieldX;

  // Hero is a structural status card. Single accent stripe on the left
  // carries the verdict colour; everything else is neutral type. The
  // only motion is a fade-in on `outcome` change so the verdict swap
  // reads as deliberate rather than static.

  return (
    <V2Card className="relative">
      {/* Verdict signal carried by the icon tile + verdict pill below —
          no left-edge accent stripe. */}
      <div className="relative px-6 py-5 flex items-center gap-6">
        {/* Compact icon */}
        <div
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}40`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>

        {/* Headline */}
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.textMuted }}
          >
            Admission decision · PR #{seed}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              key={outcome}
              className="admv2-num-flip text-[28px] font-bold uppercase tracking-tight leading-none"
              style={{ color: accent }}
            >
              {outcome}
            </span>
            <span
              className="text-[12px]"
              style={{ color: t.textMuted }}
            >
              {diff.changes.length} files · {diff.affected.length} ripple · {decision.ruleResults.length} rules
            </span>
          </div>
        </div>

        {/* Counts — inline, neutral */}
        <div className="hidden md:flex items-center gap-5 shrink-0 pl-6 border-l" style={{ borderColor: t.borderSoft }}>
          <Count label="Block" value={decision.blockingCount} color={decision.blockingCount > 0 ? SEVERITY_COLOR.block : undefined} t={t} />
          <Count label="Warn"  value={decision.warningCount}  color={decision.warningCount > 0 ? SEVERITY_COLOR.warn : undefined} t={t} />
          <Count label="Pass"  value={decision.passingCount} t={t} />
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          <button type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.textBody,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Resample
          </button>
          <button type="button"
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: t.textHi,
              color: t.page,
            }}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            Open PR
          </button>
        </div>
      </div>
    </V2Card>
  );
}

// Count — inline label/value pair used in the hero counter strip.
function Count({ label, value, color, t }: { label: string; value: number; color?: string; t: V2Theme }) {
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
