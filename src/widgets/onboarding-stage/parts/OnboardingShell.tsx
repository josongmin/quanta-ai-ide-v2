import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme';
import { useScrollRestoration } from '@shared/lib';
import { Check } from 'lucide-react';

export type OnboardingStep = {
  id: string;
  label: string;       // stepper label, terse
  title: string;       // big page-title for the step body
  subtitle?: string;
};

type Props = {
  steps: OnboardingStep[];
  current: number;             // 0-based
  onPrev?: () => void;
  // Right-aligned action(s) for the current step. Step decides label + state.
  actions: ReactNode;
  // Step body. Wrapped in the transition layer; each step should pass its own
  // unique React subtree so the keyed transition fires on change.
  children: ReactNode;
  // Optional top-right meta (e.g. "Logged in as sora@acme.com · Sign out").
  topRight?: ReactNode;
};

// Wizard chrome shared by every onboarding step. Owns:
//   • brand wordmark + topRight slot
//   • step indicator (numbered chips, completed states)
//   • animated progress bar
//   • step body transitions (in/out keyframed with prefers-reduced-motion fallback)
//   • footer with Back / actions + a tiny session marker
//
// Pages plug only `children` and `actions`; the shell never reaches into
// step state, which keeps each step decoupled.
export function OnboardingShell({
  steps, current, onPrev, actions, children, topRight,
}: Props) {
  const { t } = useTranslation('onboarding');
  const { isDark } = useTheme();
  const pageBg = isDark ? 'var(--bg-canvas)' : 'var(--bg-surface)';
  const scrollerRef = useRef<HTMLElement>(null);
  useScrollRestoration('onboarding', scrollerRef);

  // Drive a CSS variable so the progress bar tweens between renders smoothly
  // even when React replaces the inner step subtree on transition.
  const ratio = (current + 1) / steps.length;
  const [prevRatio, setPrevRatio] = useState(0);
  const [lastRatio, setLastRatio] = useState(ratio);
  if (lastRatio !== ratio) {
    setPrevRatio(lastRatio);
    setLastRatio(ratio);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: pageBg, color: 'var(--fg-default)' }}
    >
      <header className="flex items-center justify-between px-8 h-14 shrink-0">
        <BrandMark />
        <div className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
          {topRight ?? (
            <span>
              <Trans
                i18nKey="shell.stepOf"
                t={t}
                values={{ current: current + 1, total: steps.length }}
                components={[<span key="0" style={{ color: 'var(--fg-default)' }} />]}
              />
            </span>
          )}
        </div>
      </header>

      <div className="px-8">
        <ProgressBar ratio={ratio} fromRatio={prevRatio} />
      </div>

      <main ref={scrollerRef} className="flex-1 flex justify-center overflow-y-auto">
        <div className="w-full max-w-[640px] px-6 pt-12 pb-16 flex flex-col gap-10">
          <Stepper steps={steps} current={current} />

          <StepBody index={current}>
            <header className="flex flex-col gap-2">
              <h1
                className="text-4xl font-semibold tracking-tight leading-tight"
                style={{ color: 'var(--fg-strong)' }}
              >
                {t(`steps.${steps[current].id}.title`)}
              </h1>
              <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
                {t(`steps.${steps[current].id}.subtitle`)}
              </p>
            </header>
            {children}
          </StepBody>
        </div>
      </main>

      <footer
        className="px-8 h-14 shrink-0 flex items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--border-muted)' }}
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0 || !onPrev}
          className="text-base font-medium px-2 py-1 rounded-md transition-colors"
          style={{
            color: current === 0 ? 'var(--fg-subtle)' : 'var(--fg-default)',
            opacity: current === 0 ? 0.5 : 1,
            cursor: current === 0 ? 'default' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (current !== 0) e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {t('shell.back')}
        </button>
        <div className="flex items-center gap-2">{actions}</div>
      </footer>
    </div>
  );
}

function BrandMark() {
  const { t } = useTranslation('onboarding');
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        SE
      </div>
      <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
        se · field
      </span>
      <span
        className="ml-2 text-xs uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
        style={{
          color: 'var(--fg-subtle)',
          background: 'var(--bg-surface-muted)',
        }}
      >
        {t('shell.badge')}
      </span>
    </div>
  );
}

function ProgressBar({ ratio, fromRatio }: { ratio: number; fromRatio: number }) {
  return (
    <div
      className="relative h-[2px] w-full overflow-hidden"
      style={{ background: 'var(--border-muted)' }}
      aria-hidden
    >
      <div
        className="absolute inset-y-0 left-0 origin-left"
        style={{
          background: 'var(--fg-strong)',
          transform: `scaleX(${ratio})`,
          transition: 'transform 520ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          width: '100%',
          ['--onb-from' as string]: String(fromRatio),
          ['--onb-to' as string]: String(ratio),
        }}
      />
    </div>
  );
}

function Stepper({ steps, current }: { steps: OnboardingStep[]; current: number }) {
  const { t } = useTranslation('onboarding');
  return (
    <ol className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className="relative w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums transition-colors"
              style={{
                background: done
                  ? 'var(--fg-accent)'
                  : active
                    ? 'var(--fg-strong)'
                    : 'var(--bg-surface-muted)',
                color: done || active ? 'var(--bg-canvas)' : 'var(--fg-subtle)',
                border: active ? 'none' : `1px solid ${done ? 'transparent' : 'var(--border-muted)'}`,
              }}
            >
              {done ? (
                <Check className="w-3 h-3 onb-tick" />
              ) : (
                <span>{i + 1}</span>
              )}
              {active && (
                <span
                  className="absolute inset-0 rounded-full onb-pulse-ring"
                  aria-hidden
                />
              )}
            </span>
            <span
              className="text-sm font-medium tracking-tight hidden sm:inline transition-colors"
              style={{
                color: active
                  ? 'var(--fg-strong)'
                  : done
                    ? 'var(--fg-muted)'
                    : 'var(--fg-subtle)',
              }}
            >
              {t(`steps.${s.id}.label`)}
            </span>
            {i < steps.length - 1 && (
              <span
                className="hidden sm:block w-6 h-px"
                style={{
                  background: done ? 'var(--fg-accent)' : 'var(--border-muted)',
                  transition: 'background 320ms ease',
                }}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Re-fires the onb-step-in animation whenever `index` changes by keying
// the inner div on the index. The previous step doesn't need to physically
// animate out (it unmounts), so we only key the in-animation.
function StepBody({ index, children }: { index: number; children: ReactNode }) {
  const cls = useMemo(() => `onb-step-in flex flex-col gap-8`, []);
  return (
    <div key={index} className={cls}>
      {children}
    </div>
  );
}
