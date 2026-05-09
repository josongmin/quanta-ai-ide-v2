import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Modal, GlassCard, EmptyHint } from '@shared/ui';
import {
  findPerson,
  type MergeStrategy,
  type OwnershipZone,
  type Person,
  type RefactorStack,
  type RiskBadge,
  type StackStep,
  type StackStepKind,
} from '@entities/ownership';

// AILandingPlanModal — Phase 2 manual-trigger headline. Cinematic reveal of
// the AI's landing plan: rationale → strategy → steps → footer. Pure
// presentational; reads from the already-computed mock stack and stages a
// timeline so it *feels* like the model is composing the plan in real time.

export interface AILandingPlanModalProps {
  open: boolean;
  onClose: () => void;
  zone: OwnershipZone | undefined;
  stack: RefactorStack | undefined;
  people: Person[];
}

const STEP_DELAY_MS = 850;
const RATIONALE_DELAY_MS = 1100;

const MERGE_STRATEGY_LABEL: Record<MergeStrategy, string> = {
  'split-now': 'SPLIT NOW',
  'keep-as-one': 'KEEP AS ONE',
  'land-bottom-up': 'LAND BOTTOM-UP',
  parallelizable: 'PARALLELIZABLE',
  'risky-serial': 'RISKY SERIAL',
};

const KIND_LABEL: Record<StackStepKind, string> = {
  prep: 'PREP',
  adapter: 'ADAPTER',
  migration: 'MIGRATION',
  cleanup: 'CLEANUP',
  gate: 'GATE',
};

// Deterministic but hand-feeling reviewer-fit copy per step kind. The plan
// reference asks for "Why this reviewer for this step?" — short, signal-y.
const WHY_REVIEWER_BY_KIND: Record<StackStepKind, string> = {
  prep: 'lowest blast radius — backup engineer can prep without page-time risk',
  adapter: 'shape change touches both sides — interface owner spots the seam',
  migration: 'primary owner sees every callsite already; fastest to verify',
  cleanup: 'historical author recognises legacy traps the linter cannot',
  gate: 'platform reviewer holds canary keys and rollout dashboards',
};

function riskTone(risk: RiskBadge): { fg: string; bg: string; label: string } {
  if (risk === 'low') {
    return { fg: 'var(--intent-success-fg)', bg: 'var(--intent-success-bg)', label: 'LOW RISK' };
  }
  if (risk === 'medium') {
    return { fg: 'var(--intent-warn-fg)', bg: 'var(--intent-warn-bg)', label: 'MED RISK' };
  }
  return { fg: 'var(--intent-danger-fg)', bg: 'var(--intent-danger-bg)', label: 'HIGH RISK' };
}

function avatarStyle(person: Person | undefined, size: number): CSSProperties {
  if (!person) {
    return {
      width: size,
      height: size,
      background: 'var(--bg-surface-muted)',
      border: '1px solid var(--border-muted)',
      color: 'var(--fg-subtle)',
    };
  }
  const stale = !person.active;
  const sat = stale ? 14 : 58;
  const ld = stale ? 36 : 44;
  return {
    width: size,
    height: size,
    background: `hsl(${person.avatarHue} ${sat}% ${ld}% / ${stale ? 0.55 : 0.92})`,
    border: '1px solid var(--border-muted)',
    color: 'rgba(255,255,255,0.94)',
  };
}

function PersonAvatar({ person, size }: { person: Person | undefined; size: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold tracking-[0.04em] shrink-0"
      style={{ ...avatarStyle(person, size), fontSize: Math.max(8, Math.round(size * 0.42)) }}
      aria-hidden="true"
    >
      {person?.initials ?? '??'}
    </span>
  );
}

function BlinkingCursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-baseline ml-[2px]"
      style={{
        width: 6,
        height: 12,
        background: 'var(--fg-default)',
        animation: 'ailp-blink 900ms steps(2, end) infinite',
        verticalAlign: '-1px',
      }}
    />
  );
}

// Ambient keyframes injected once. Only opacity + height/margin animations
// — no transforms, so backdrop-blur on inner GlassCards stays alive.
const ANIM_STYLE = `
@keyframes ailp-blink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@keyframes ailp-fade-in { from { opacity: 0; margin-top: 4px; } to { opacity: 1; margin-top: 0; } }
`;

function RevealedBlock({
  shown,
  children,
  delayMs = 0,
}: {
  shown: boolean;
  children: React.ReactNode;
  delayMs?: number;
}) {
  if (!shown) return null;
  return (
    <div
      style={{
        animation: `ailp-fade-in 320ms ease-out ${delayMs}ms both`,
      }}
    >
      {children}
    </div>
  );
}

function PhaseLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] font-black uppercase tracking-[0.22em] mb-1.5"
      style={{ color: 'var(--fg-subtle)' }}
    >
      {children}
    </div>
  );
}

function StrategyPill({ strategy }: { strategy: MergeStrategy }) {
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-strong)',
        border: '1px solid var(--border-default)',
      }}
    >
      {MERGE_STRATEGY_LABEL[strategy]}
    </span>
  );
}

function RiskPill({ risk }: { risk: RiskBadge }) {
  const tone = riskTone(risk);
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.18em] shrink-0"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: '1px solid color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {tone.label}
    </span>
  );
}

function KindPill({ kind }: { kind: StackStepKind }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.22em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

function ReviewerChip({ person }: { person: Person | undefined }) {
  if (!person) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <PersonAvatar person={undefined} size={22} />
        <span className="text-[10px] italic" style={{ color: 'var(--fg-subtle)' }}>
          unassigned
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 min-w-0"
      title={`${person.name} · ${person.team}`}
    >
      <PersonAvatar person={person} size={22} />
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className="text-[11px] font-semibold truncate"
          style={{ color: person.active ? 'var(--fg-default)' : 'var(--fg-muted)' }}
        >
          {person.name}
        </span>
        <span
          className="text-[9px] font-mono truncate"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {person.team}
        </span>
      </div>
    </div>
  );
}

function WhyReviewer({ kind }: { kind: StackStepKind }) {
  return (
    <p
      className="text-[10.5px] leading-snug italic"
      style={{ color: 'var(--fg-muted)' }}
    >
      <span
        className="not-italic font-black uppercase tracking-[0.22em] mr-1"
        style={{ color: 'var(--fg-subtle)', fontSize: '8.5px' }}
      >
        Why
      </span>
      {WHY_REVIEWER_BY_KIND[kind]}
    </p>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0 text-[11px] font-black tabular-nums"
      style={{
        width: 24,
        height: 24,
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function StepReveal({
  step,
  index,
  reviewer,
}: {
  step: StackStep;
  index: number;
  reviewer: Person | undefined;
}) {
  return (
    <GlassCard tone="inner" className="px-3 py-2.5">
      <div className="grid grid-cols-[24px_1fr] gap-2.5 items-start">
        <StepNumber n={index + 1} />
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <KindPill kind={step.kind} />
              <h4
                className="text-[12px] font-semibold leading-snug truncate"
                style={{ color: 'var(--fg-strong)' }}
              >
                {step.title}
              </h4>
            </div>
            <RiskPill risk={step.blastRadius} />
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <ReviewerChip person={reviewer} />
            <span
              className="text-[9px] font-mono tabular-nums shrink-0"
              style={{ color: 'var(--fg-subtle)' }}
            >
              ~{step.estimatedDiffLines} LOC
            </span>
          </div>
          <WhyReviewer kind={step.kind} />
        </div>
      </div>
    </GlassCard>
  );
}

function GeneratedPill() {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-[0.22em]"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span
        aria-hidden
        className="inline-block w-1 h-1 rounded-full"
        style={{ background: 'var(--fg-muted)' }}
      />
      Generated
    </span>
  );
}

function FooterButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] transition-colors"
      style={{
        background: primary ? 'var(--bg-active)' : 'transparent',
        color: primary ? 'var(--fg-strong)' : 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        if (!primary) e.currentTarget.style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!primary) e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

export function AILandingPlanModal({
  open,
  onClose,
  zone,
  stack,
  people,
}: AILandingPlanModalProps): JSX.Element | null {
  // Stage index — 0 nothing, 1 rationale, 2 strategy, 3..3+steps-1 each step,
  // 3+steps footer revealed.
  const [revealed, setRevealed] = useState(0);
  const timersRef = useRef<number[]>([]);

  const totalStages = useMemo(() => {
    if (!stack) return 0;
    return 3 + stack.steps.length; // includes the final "footer" stage
  }, [stack]);

  const personIndex = useMemo(() => {
    const m = new Map<string, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  // Start / reset cadence whenever the modal is opened with a stack present.
  useEffect(() => {
    // Always clear pending timers on (re)entry.
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];

    if (!open || !stack) {
      setRevealed(0);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setRevealed(totalStages);
      return;
    }

    setRevealed(0);
    const schedule: Array<{ at: number; to: number }> = [];
    let cursor = 0;
    // Stage 1: rationale
    cursor += 250;
    schedule.push({ at: cursor, to: 1 });
    // Stage 2: strategy after rationale finishes "writing"
    cursor += RATIONALE_DELAY_MS;
    schedule.push({ at: cursor, to: 2 });
    // Stages 3..: each step
    for (let i = 0; i < stack.steps.length; i += 1) {
      cursor += STEP_DELAY_MS;
      schedule.push({ at: cursor, to: 3 + i });
    }
    // Final stage: footer
    cursor += STEP_DELAY_MS;
    schedule.push({ at: cursor, to: 3 + stack.steps.length });

    for (const ev of schedule) {
      const id = window.setTimeout(() => setRevealed(ev.to), ev.at);
      timersRef.current.push(id);
    }

    return () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };
  }, [open, stack, totalStages]);

  const skip = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
    setRevealed(totalStages);
  };

  if (!open) return null;

  // Empty / fallback path — still renders a real modal.
  if (!zone || !stack) {
    return (
      <Modal open={open} onClose={onClose} ariaLabel="AI landing plan" width={520}>
        <style>{ANIM_STYLE}</style>
        <div className="px-5 py-4 space-y-3">
          <header className="flex items-center justify-between gap-2">
            <h2
              className="text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'var(--fg-strong)' }}
            >
              AI Landing Plan
            </h2>
            <FooterButton label="Close" onClick={onClose} />
          </header>
          <EmptyHint text="No stack to plan for this zone." />
        </div>
      </Modal>
    );
  }

  const advice = stack.mergeStrategyAdvice;
  const stepsRevealedCount = Math.max(0, Math.min(stack.steps.length, revealed - 2));
  const footerShown = revealed >= 3 + stack.steps.length;
  const rationaleStillWriting = revealed === 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel="AI landing plan"
      width="100%"
      maxWidth={640}
      align="top"
    >
      <style>{ANIM_STYLE}</style>
      <div className="flex flex-col max-h-[calc(100vh-64px)]">
        {/* Header */}
        <header
          className="flex items-start justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-muted)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2
                className="text-[11px] font-black uppercase tracking-[0.22em]"
                style={{ color: 'var(--fg-strong)' }}
              >
                AI Landing Plan
              </h2>
              <GeneratedPill />
            </div>
            <div
              className="text-[12px] truncate"
              style={{ color: 'var(--fg-muted)' }}
              title={zone.label}
            >
              {zone.label}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!footerShown && (
              <button
                type="button"
                onClick={skip}
                className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
                style={{
                  background: 'transparent',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                aria-label="Skip animation and show full plan"
              >
                Skip
              </button>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Phase 1: Reasoning */}
          <RevealedBlock shown={revealed >= 1}>
            <GlassCard tone="inner" className="px-3 py-2.5">
              <PhaseLabel>Reasoning</PhaseLabel>
              <p
                className="text-[12.5px] leading-snug"
                style={{ color: 'var(--fg-default)' }}
              >
                {stack.rationale}
                {rationaleStillWriting && <BlinkingCursor />}
              </p>
            </GlassCard>
          </RevealedBlock>

          {/* Phase 2: Strategy decision */}
          <RevealedBlock shown={revealed >= 2}>
            <GlassCard tone="inner" className="px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <PhaseLabel>Merge strategy</PhaseLabel>
                <StrategyPill strategy={advice.strategy} />
              </div>
              <p
                className="text-[12px] leading-snug"
                style={{ color: 'var(--fg-default)' }}
              >
                {advice.reason}
              </p>
              {advice.alternative && (
                <p
                  className="text-[11px] leading-snug italic"
                  style={{ color: 'var(--fg-subtle)' }}
                >
                  Considered alternative:{' '}
                  <span
                    className="not-italic font-black uppercase tracking-[0.18em]"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {MERGE_STRATEGY_LABEL[advice.alternative.strategy]}
                  </span>{' '}
                  — {advice.alternative.reason}
                </p>
              )}
            </GlassCard>
          </RevealedBlock>

          {/* Phase 3: Steps */}
          {stack.steps.length === 0 ? (
            <RevealedBlock shown={revealed >= 2}>
              <EmptyHint text="No steps planned for this stack." />
            </RevealedBlock>
          ) : (
            <div>
              <RevealedBlock shown={revealed >= 2}>
                <PhaseLabel>Stack steps</PhaseLabel>
              </RevealedBlock>
              <ol className="space-y-2 list-none">
                {stack.steps.slice(0, stepsRevealedCount).map((step, idx) => {
                  const reviewer =
                    personIndex.get(step.suggestedReviewerId) ??
                    findPerson(step.suggestedReviewerId);
                  return (
                    <li key={step.id}>
                      <RevealedBlock shown>
                        <StepReveal step={step} index={idx} reviewer={reviewer} />
                      </RevealedBlock>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Phase 4: Footer */}
        {footerShown && (
          <footer
            className="px-5 py-3 border-t flex items-center justify-between gap-3 flex-wrap"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <div
              className="text-[11px] font-semibold"
              style={{ color: 'var(--fg-default)' }}
            >
              <span
                className="text-[9px] font-black uppercase tracking-[0.22em] mr-1.5"
                style={{ color: 'var(--fg-subtle)' }}
              >
                Plan ready
              </span>
              estimated{' '}
              <span style={{ color: 'var(--fg-strong)' }}>
                {stack.totalEstimatedDays}
              </span>{' '}
              {stack.totalEstimatedDays === 1 ? 'day' : 'days'}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <FooterButton
                label="Open as draft PRs"
                onClick={() => {
                  console.log('[AILandingPlanModal] open-as-draft-prs', {
                    zoneId: zone.id,
                    stackId: stack.id,
                  });
                }}
              />
              <FooterButton
                label="Copy as checklist"
                onClick={() => {
                  console.log('[AILandingPlanModal] copy-as-checklist', {
                    zoneId: zone.id,
                    stackId: stack.id,
                  });
                }}
              />
              <FooterButton label="Close" onClick={onClose} primary />
            </div>
          </footer>
        )}
      </div>
    </Modal>
  );
}
