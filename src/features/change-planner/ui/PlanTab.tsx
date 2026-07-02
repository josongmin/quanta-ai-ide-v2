// PlanTab — renders a ChangePlan as ordered steps + seams + PR splits.
//
// Layout: a numbered step list at the top (the thing reviewers read first),
// then the seams the planner inserted, then the suggested PR breakdown.
// Each step shows a number badge, kind chip, title, rationale, and the
// required-checks list. No left-edge stripes; the kind is encoded by chip
// label, not a coloured spine.

import { Badge } from '@shared/ui/Badge';
import type { ChangePlan, ChangeStep } from '../model/types';

type Props = {
  plan: ChangePlan;
}

const KIND_LABEL: Record<ChangeStep['kind'], string> = {
  prep: 'prep',
  adapter: 'adapter',
  migration: 'migration',
  cleanup: 'cleanup',
  gate: 'gate',
};

function StepCard({ step }: { step: ChangeStep }) {
  return (
    <li
      className="rounded-xl border p-3"
      style={{
        background: 'var(--bg-surface-muted)',
        borderColor: 'var(--border-default)',
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-mono font-bold tabular-nums shrink-0"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--fg-default)',
          }}
        >
          {step.order}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              {KIND_LABEL[step.kind]}
            </Badge>
            <span
              className="text-[11px] font-bold truncate"
              style={{ color: 'var(--fg-default)' }}
            >
              {step.title}
            </span>
          </div>

          <p
            className="mt-1.5 text-[10px] leading-snug"
            style={{ color: 'var(--fg-muted)' }}
          >
            {step.rationale}
          </p>

          {step.requiredChecks.length > 0 && (
            <div className="mt-2">
              <div
                className="text-[8.5px] font-black uppercase tracking-[0.16em] mb-1"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Required checks
              </div>
              <ul className="flex flex-wrap gap-1">
                {step.requiredChecks.map((check) => (
                  <li
                    key={check}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{
                      background: 'var(--bg-elevated)',
                      color: 'var(--fg-default)',
                    }}
                  >
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.obligations.length > 0 && (
            <div className="mt-2">
              <div
                className="text-[8.5px] font-black uppercase tracking-[0.16em] mb-1"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Obligations
              </div>
              <ul className="flex flex-wrap gap-1">
                {step.obligations.map((ob) => (
                  <li
                    key={ob}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                    style={{
                      background: 'transparent',
                      color: 'var(--fg-muted)',
                      border: '1px dashed var(--border-default)',
                    }}
                  >
                    {ob}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function PlanTab({ plan }: Props) {
  return (
    <div className="space-y-3">
      <section>
        <div
          className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Plan steps
        </div>
        <ol className="space-y-2">
          {plan.steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </ol>
      </section>

      {plan.seams.length > 0 && (
        <section>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Safe seams
          </div>
          <ul className="space-y-1.5">
            {plan.seams.map((seam) => (
              <li
                key={seam.id}
                className="rounded-xl border px-3 py-2"
                style={{
                  background: 'var(--bg-surface-muted)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">
                    {seam.cutKind}
                  </Badge>
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {seam.nodeId}
                  </span>
                </div>
                <p
                  className="mt-1 text-[10px] leading-snug"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {seam.reason}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.prSplits.length > 0 && (
        <section>
          <div
            className="text-[9px] font-black uppercase tracking-[0.18em] mb-1.5"
            style={{ color: 'var(--fg-subtle)' }}
          >
            Suggested PR splits
          </div>
          <ul className="space-y-1.5">
            {plan.prSplits.map((split) => (
              <li
                key={split.id}
                className="rounded-xl border px-3 py-2"
                style={{
                  background: 'var(--bg-surface-muted)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: 'var(--fg-default)' }}
                  >
                    {split.title}
                  </span>
                  <span
                    className="text-[9px] font-mono tabular-nums"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {split.stepIds.length} step{split.stepIds.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p
                  className="mt-1 text-[10px] leading-snug"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {split.rationale}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
