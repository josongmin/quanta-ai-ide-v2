import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { useTheme } from '@shared/theme';
import { useDialogA11y } from '@shared/ui';
import { useScrollLock } from '@shared/lib';

type Provider = 'github' | 'gitlab' | 'bitbucket' | 'google' | 'sso';

type Props = {
  provider: Provider;
  onCancel: () => void;
  onComplete: () => void;
};

// prefers-reduced-motion at mount. Read once (SSR-safe guard); the overlay is
// short-lived, so we don't need to subscribe to changes mid-flight.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Mock OAuth interstitial. While a real flow would window.location.assign()
// to the provider, here we pretend the user is over there and "comes back"
// after a few seconds. Cancellable so reviewers don't get stuck.
//
// Presented as a modal dialog: it has role="dialog"/aria-modal, moves focus in
// on open and traps it, restores focus on close, and closes on Escape (all via
// the shared useDialogA11y contract). The auto-advance timers are cleared on
// unmount. Respects prefers-reduced-motion (skips the moving-dot animation).
export function OAuthRedirectOverlay({ provider, onCancel, onComplete }: Props) {
  const { t } = useTranslation('auth');
  const providerLabel = t(`oauthOverlay.provider.${provider}`);
  const { isDark } = useTheme();
  const [phase, setPhase] = useState<'redirecting' | 'on-provider' | 'returning'>('redirecting');
  const reduceMotion = prefersReducedMotion();

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  // Dialog a11y: initial focus + focus trap + focus restore + Escape-to-close.
  useDialogA11y(dialogRef, true, onCancel, { modal: true });

  // Lock body scroll while the overlay is up.
  useScrollLock(true);

  useEffect(() => {
    // With reduced motion, skip straight through the intermediate phases.
    if (reduceMotion) {
      const t = setTimeout(() => { onComplete(); }, 600);
      return () => { clearTimeout(t); };
    }
    const t1 = setTimeout(() => { setPhase('on-provider'); }, 700);
    const t2 = setTimeout(() => { setPhase('returning'); }, 2200);
    const t3 = setTimeout(() => { onComplete(); }, 3000);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [onComplete, reduceMotion]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      tabIndex={-1}
      className="absolute inset-0 z-50 flex items-center justify-center p-6 outline-none"
      style={{
        background: isDark ? 'rgba(10,13,18,0.92)' : 'rgba(255,255,255,1)',
        ...(isDark ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
      }}
    >
      <div className={`w-full max-w-[400px] flex flex-col items-center gap-6 ${reduceMotion ? '' : 'onb-step-in'}`}>
        <div className="flex items-center gap-3">
          <ProviderGlyph provider={provider} active={phase !== 'returning'} />
          <Connector phase={phase} reduceMotion={reduceMotion} />
          <BrandGlyph active={phase === 'returning'} />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <h2
            id={titleId}
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: 'var(--fg-strong)' }}
          >
            {phase === 'redirecting'  && t('oauthOverlay.redirecting', { provider: providerLabel })}
            {phase === 'on-provider'  && t('oauthOverlay.waitingFor', { provider: providerLabel })}
            {phase === 'returning'    && t('oauthOverlay.almostThere')}
          </h2>
          <p id={descId} className="text-base max-w-[320px]" style={{ color: 'var(--fg-muted)' }}>
            {phase === 'redirecting'  && t('oauthOverlay.redirectingBody')}
            {phase === 'on-provider'  && t('oauthOverlay.onProviderBody', { provider: providerLabel })}
            {phase === 'returning'    && t('oauthOverlay.returningBody')}
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono tabular-nums"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-subtle)',
          }}
        >
          <Loader2 className={reduceMotion ? 'w-3 h-3' : 'w-3 h-3 animate-spin'} />
          state: <span style={{ color: 'var(--fg-default)' }}>{stateToken(phase)}</span>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--fg-muted)' }}
        >
          {t('oauthOverlay.cancel')}
        </button>
      </div>
    </div>
  );
}

// Two-letter mono fallback for providers without a dedicated glyph.
const PROVIDER_MONO: Partial<Record<Provider, string>> = {
  gitlab: 'GL',
  bitbucket: 'BB',
};

function ProviderGlyph({ provider, active }: { provider: Provider; active: boolean }) {
  const Icon = provider === 'github' ? GithubIcon : provider === 'google' ? Mail : provider === 'sso' ? KeyRound : null;
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={{
        background: 'var(--bg-surface-muted)',
        border: `1.5px solid ${active ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'none',
      }}
    >
      {Icon
        ? <Icon className="w-5 h-5" style={{ color: 'var(--fg-strong)' }} />
        : <span className="text-xs font-mono font-bold" style={{ color: 'var(--fg-strong)' }}>{PROVIDER_MONO[provider] ?? '··'}</span>}
    </div>
  );
}

function BrandGlyph({ active }: { active: boolean }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black transition-all"
      style={{
        background: 'var(--fg-strong)',
        color: 'var(--bg-canvas)',
        border: `1.5px solid ${active ? 'var(--fg-accent)' : 'transparent'}`,
        boxShadow: active ? '0 0 0 4px color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'none',
      }}
    >
      SE
    </div>
  );
}

function Connector({ phase, reduceMotion }: { phase: 'redirecting' | 'on-provider' | 'returning'; reduceMotion: boolean }) {
  // Tiny SVG with a moving dot showing direction of travel.
  const direction = phase === 'returning' ? -1 : 1;
  // Under reduced motion, park the dot at the destination edge instead of
  // animating it back and forth.
  const restCx = reduceMotion ? (direction === 1 ? 60 : 0) : (direction === 1 ? 0 : 60);
  return (
    <svg width="60" height="12" viewBox="0 0 60 12" aria-hidden>
      <line x1="0" y1="6" x2="60" y2="6" stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="2 3" />
      <circle r="3" cy="6" cx={restCx} fill="var(--fg-accent)">
        {!reduceMotion && (
          <animate
            attributeName="cx"
            from={direction === 1 ? 0 : 60}
            to={direction === 1 ? 60 : 0}
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </circle>
    </svg>
  );
}

function stateToken(phase: string) {
  // Just a deterministic-looking opaque token so the line reads as real.
  const seed = phase.charCodeAt(0) + phase.length;
  return `oa_${seed}f8q${(seed * 31).toString(36)}…`;
}
