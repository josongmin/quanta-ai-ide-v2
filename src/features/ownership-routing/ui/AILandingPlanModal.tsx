import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Modal, EmptyHint } from '@shared/ui';
import {
  type OwnershipZone,
  type Person,
  type RefactorStack,
} from '@entities/ownership';
import {
  ANIM_STYLE,
  FooterButton,
  PlanBody,
  PlanFooter,
  PlanHeader,
  RATIONALE_DELAY_MS,
  STEP_DELAY_MS,
} from './ai-landing-plan/parts';

// AILandingPlanModal — Phase 2 manual-trigger headline. Cinematic reveal of
// the AI's landing plan: rationale → strategy → steps → footer. Pure
// presentational; reads from the already-computed mock stack and stages a
// timeline so it *feels* like the model is composing the plan in real time.

export type AILandingPlanModalProps = {
  open: boolean;
  onClose: () => void;
  zone: OwnershipZone | undefined;
  stack: RefactorStack | undefined;
  people: Person[];
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
  // The setRevealed calls drive the stage-reveal animation; they must run
  // from an effect because they are paired with imperative window.setTimeout
  // scheduling and timer cleanup. Deriving `revealed` from props would skip
  // the animated cadence entirely.
  useEffect(() => {
    // Always clear pending timers on (re)entry.
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];

    if (!open || !stack) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const schedule: { at: number; to: number }[] = [];
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
      const id = window.setTimeout(() => { setRevealed(ev.to); }, ev.at);
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

  const footerShown = revealed >= 3 + stack.steps.length;

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
        <PlanHeader zone={zone} footerShown={footerShown} onSkip={skip} />
        <PlanBody stack={stack} revealed={revealed} personIndex={personIndex} />
        {footerShown && <PlanFooter zone={zone} stack={stack} onClose={onClose} />}
      </div>
    </Modal>
  );
}
