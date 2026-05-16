import { useMemo, useState } from 'react';
import { GitCompareArrows } from 'lucide-react';
import type { RuleEvaluation } from '@entities/admission';
import type { FileRecord } from '@entities/repo';
import type { ConsensusFinding } from './consensus';
import {
  scoreFindings, aggregateRisk, aggregateRiskWithoutRule,
} from './risk';

// Counterfactual preview (Gate §G4). The user picks a rule from a dropdown
// (defaults to the highest-risk firing rule); the card shows two numbers
// side-by-side:
//
//   Aggregate risk now           ──►   Aggregate risk if disabled
//   42/100                              17/100
//                                       (-25)
//
// Plus a sentence: "Disabling 'Blast cap' would let 1 PR in 30 retro
// replays through that currently blocks." The retro count is approximated
// from the current PR alone (1 = "this would unblock") to keep the demo
// honest without re-running 30 evaluations.
//
// The card is informational only — it doesn't actually disable the rule.
// Acts as a thinking tool for maintainers debating "is this rule worth
// the noise?".

export function CounterfactualCard({
  fired, findings, fileById,
}: {
  fired: RuleEvaluation[];
  findings: ConsensusFinding[];
  fileById: (id: number) => FileRecord | undefined;
}) {
  const baseScored = scoreFindings(findings, fileById);
  const baseAgg = aggregateRisk(baseScored);

  // Default selection — highest-risk firing rule.
  const defaultRuleId = useMemo(() => {
    if (fired.length === 0) return null;
    let best: { id: string; score: number } | null = null;
    for (const r of fired) {
      const sevW = r.status === 'block' ? 1 : 0.5;
      const score = sevW * r.hits.length;
      if (!best || score > best.score) best = { id: r.ruleId, score };
    }
    return best?.id ?? fired[0]?.ruleId ?? null;
  }, [fired]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultRuleId);
  const effectiveId = selectedId ?? defaultRuleId;

  const counterfactualAgg = useMemo(() => {
    if (!effectiveId) return baseAgg;
    return aggregateRiskWithoutRule(fired, effectiveId, fileById);
  }, [fired, effectiveId, fileById, baseAgg]);

  if (fired.length === 0) return null;

  const delta = counterfactualAgg - baseAgg;
  const deltaColor = delta < 0
    ? 'var(--intent-success-fg)'
    : delta > 0
      ? 'var(--intent-danger-fg)'
      : 'var(--fg-subtle)';

  const selectedRule = fired.find((r) => r.ruleId === effectiveId);

  return (
    <section
      className="rounded-md overflow-hidden"
      style={{
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-default)',
      }}
    >
      <header
        className="flex items-center gap-2 px-4 h-9"
        style={{
          background: 'var(--bg-surface-muted)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <GitCompareArrows className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
        <h3
          className="text-[11px] uppercase tracking-[0.14em] font-semibold"
          style={{ color: 'var(--fg-strong)' }}
        >
          Counterfactual
        </h3>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          what if this rule were disabled?
        </span>
      </header>

      <div className="p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span
            className="text-[10px] uppercase tracking-[0.14em] font-medium"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Hypothetical disable
          </span>
          <select
            value={effectiveId ?? ''}
            onChange={(e) => { setSelectedId(e.target.value || null); }}
            className="h-8 px-2 rounded-md text-[12px] outline-none"
            style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
            }}
          >
            {fired.map((r) => (
              <option key={r.ruleId} value={r.ruleId}>
                {r.ruleName} · {r.hits.length} hit{r.hits.length === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-4 mt-1">
          <RiskFigure label="Risk now" value={baseAgg} />
          <div
            className="flex-1 h-px"
            style={{ background: 'var(--border-default)' }}
          />
          <RiskFigure
            label="If disabled"
            value={counterfactualAgg}
            tone={deltaColor}
          />
          <div
            className="text-[11px] font-mono tabular-nums shrink-0 px-2 py-1 rounded"
            style={{
              color: deltaColor,
              background: 'var(--bg-surface-muted)',
            }}
          >
            {delta > 0 ? '+' : ''}{delta}
          </div>
        </div>

        <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
          {delta < 0 && selectedRule ? (
            <>
              Disabling <strong style={{ color: 'var(--fg-strong)' }}>{selectedRule.ruleName}</strong>{' '}
              would drop this PR&apos;s risk by{' '}
              <strong style={{ color: deltaColor }}>{Math.abs(delta)}</strong> point{Math.abs(delta) === 1 ? '' : 's'}.
              Confirm in Calibration that historical F1 justifies the rule before disabling.
            </>
          ) : (
            <>The selected rule isn&apos;t materially affecting this PR&apos;s risk score.</>
          )}
        </p>
      </div>
    </section>
  );
}

function RiskFigure({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </span>
      <span
        className="text-[18px] font-semibold tabular-nums tracking-tight"
        style={{ color: tone ?? 'var(--fg-strong)' }}
      >
        {value}<span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>/100</span>
      </span>
    </div>
  );
}
