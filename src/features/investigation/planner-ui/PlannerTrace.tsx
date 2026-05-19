import type { CSSProperties } from 'react';
import type { ContextBundle, EvidenceItem } from '@entities/investigation';
import { EvidenceStrip } from '../evidence';
import type { PlannerStep, PlannerTrace as PlannerTraceData } from '../planner';

type Props = {
  trace: PlannerTraceData | null;
  streamingSteps?: PlannerStep[];
  bundle: ContextBundle | null;
};

function pickEvidence(bundle: ContextBundle | null, ids: string[]): EvidenceItem[] {
  if (!bundle) return [];
  const map = new Map(bundle.evidence.map((e) => [e.id, e]));
  const out: EvidenceItem[] = [];
  for (const id of ids) {
    const found = map.get(id);
    if (found) out.push(found);
  }
  return out;
}

function StepCard({
  step,
  index,
  bundle,
}: {
  step: PlannerStep;
  index: number;
  bundle: ContextBundle | null;
}) {
  const cardStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-default)',
  };
  const evidence = pickEvidence(bundle, step.gatheredEvidenceIds);
  return (
    <div className="border rounded-md p-2.5 flex flex-col gap-1.5" style={cardStyle}>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono uppercase tracking-wider"
          style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
        >
          step {index + 1}
        </span>
        <span
          className="font-medium leading-snug"
          style={{ color: 'var(--fg-strong)', fontSize: '12px' }}
        >
          {step.question}
        </span>
      </div>

      {evidence.length > 0 ? <EvidenceStrip evidence={evidence} /> : null}

      <div
        className="leading-snug"
        style={{ color: 'var(--fg-muted)', fontSize: '11px' }}
      >
        {step.conclusion}
      </div>

      <div
        className="italic"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        {step.nextQuestion ? `Next: ${step.nextQuestion}` : '(end)'}
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 2,
        height: 10,
        background: 'var(--border-default)',
        marginLeft: 14,
      }}
    />
  );
}

function PendingStep({ index }: { index: number }) {
  const cardStyle: CSSProperties = {
    background: 'var(--bg-surface-muted)',
    borderColor: 'var(--border-muted)',
  };
  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    background: 'var(--intent-success-vivid)',
    borderRadius: '999px',
    display: 'inline-block',
  };
  return (
    <div className="border rounded-md p-2.5 flex items-center gap-2" style={cardStyle}>
      <span className="animate-pulse" style={dotStyle} aria-hidden="true" />
      <span
        className="font-mono uppercase tracking-wider"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        step {index + 1}…
      </span>
      <span style={{ color: 'var(--fg-muted)', fontSize: '11px' }}>reflecting</span>
    </div>
  );
}

const TOTAL_STEPS = 3;

export function PlannerTrace({ trace, streamingSteps, bundle }: Props) {
  const steps: PlannerStep[] = trace ? trace.steps : (streamingSteps ?? []);
  const isStreaming = !trace && (streamingSteps?.length ?? 0) > 0;
  const showPending = isStreaming && steps.length < TOTAL_STEPS;

  if (steps.length === 0 && !showPending) return null;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="font-mono uppercase tracking-wider"
        style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
      >
        Reflection trace
      </div>
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col">
            <StepCard step={step} index={i} bundle={bundle} />
            {i < steps.length - 1 || showPending ? <Connector /> : null}
          </div>
        ))}
        {showPending ? <PendingStep index={steps.length} /> : null}
      </div>

      {trace ? (
        <div
          className="border rounded-md p-2.5 mt-1.5"
          style={{
            background: 'var(--bg-surface-muted)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div
            className="font-mono uppercase tracking-wider mb-1"
            style={{ color: 'var(--fg-subtle)', fontSize: '10px' }}
          >
            Final
          </div>
          <div
            className="leading-snug"
            style={{ color: 'var(--fg-default)', fontSize: '12px' }}
          >
            {trace.finalConclusion}
          </div>
        </div>
      ) : null}
    </div>
  );
}
