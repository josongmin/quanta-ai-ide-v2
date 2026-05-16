import { useEffect, useState } from 'react';
import { Loader2, Mail, KeyRound } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { useTheme } from '@shared/theme';

type Provider = 'github' | 'gitlab' | 'google' | 'sso';

type Props = {
  provider: Provider;
  onCancel: () => void;
  onComplete: () => void;
};

// Mock OAuth interstitial. While a real flow would window.location.assign()
// to the provider, here we pretend the user is over there and "comes back"
// after a few seconds. Cancellable so reviewers don't get stuck.
export function OAuthRedirectOverlay({ provider, onCancel, onComplete }: Props) {
  const { isDark } = useTheme();
  const [phase, setPhase] = useState<'redirecting' | 'on-provider' | 'returning'>('redirecting');

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase('on-provider'); }, 700);
    const t2 = setTimeout(() => { setPhase('returning'); }, 2200);
    const t3 = setTimeout(() => { onComplete(); }, 3000);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: isDark ? 'rgba(10,13,18,0.92)' : 'rgba(255,255,255,1)',
        ...(isDark ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } : {}),
      }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6 onb-step-in">
        <div className="flex items-center gap-3">
          <ProviderGlyph provider={provider} active={phase !== 'returning'} />
          <Connector phase={phase} />
          <BrandGlyph active={phase === 'returning'} />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <h2
            className="text-[15px] font-semibold tracking-tight"
            style={{ color: 'var(--fg-strong)' }}
          >
            {phase === 'redirecting'  && `Redirecting to ${PROVIDER_LABEL[provider]}…`}
            {phase === 'on-provider'  && `Waiting for ${PROVIDER_LABEL[provider]}`}
            {phase === 'returning'    && 'Almost there…'}
          </h2>
          <p className="text-[12px] max-w-[320px]" style={{ color: 'var(--fg-muted)' }}>
            {phase === 'redirecting'  && 'Opening their secure sign-in page in this window.'}
            {phase === 'on-provider'  && `Approve the request on ${PROVIDER_LABEL[provider]} to come back here.`}
            {phase === 'returning'    && 'Validating the response and signing you in.'}
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-mono tabular-nums"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
            color: 'var(--fg-subtle)',
          }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          state: <span style={{ color: 'var(--fg-default)' }}>{stateToken(phase)}</span>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--fg-muted)' }}
        >
          Cancel and use a different method
        </button>
      </div>
    </div>
  );
}

const PROVIDER_LABEL: Record<Provider, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  google: 'Google',
  sso:    'your identity provider',
};

function ProviderGlyph({ provider, active }: { provider: Provider; active: boolean }) {
  const Icon = provider === 'github' ? GithubIcon : provider === 'google' ? Mail : provider === 'sso' ? KeyRound : null;
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
      style={{
        background: 'var(--bg-surface-muted)',
        border: `1.5px solid ${active ? 'var(--brand-vivid)' : 'var(--border-muted)'}`,
        boxShadow: active ? '0 0 0 4px var(--brand-bg)' : 'none',
      }}
    >
      {Icon
        ? <Icon className="w-5 h-5" style={{ color: 'var(--fg-strong)' }} />
        : <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--fg-strong)' }}>GL</span>}
    </div>
  );
}

function BrandGlyph({ active }: { active: boolean }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-[12px] font-black transition-all"
      style={{
        background: 'var(--fg-strong)',
        color: 'var(--bg-canvas)',
        border: `1.5px solid ${active ? 'var(--brand-vivid)' : 'transparent'}`,
        boxShadow: active ? '0 0 0 4px var(--brand-bg)' : 'none',
      }}
    >
      SE
    </div>
  );
}

function Connector({ phase }: { phase: 'redirecting' | 'on-provider' | 'returning' }) {
  // Tiny SVG with a moving dot showing direction of travel.
  const direction = phase === 'returning' ? -1 : 1;
  return (
    <svg width="60" height="12" viewBox="0 0 60 12" aria-hidden>
      <line x1="0" y1="6" x2="60" y2="6" stroke="var(--border-default)" strokeWidth="1.5" strokeDasharray="2 3" />
      <circle r="3" cy="6" fill="var(--brand-vivid)">
        <animate
          attributeName="cx"
          from={direction === 1 ? 0 : 60}
          to={direction === 1 ? 60 : 0}
          dur="1.2s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

function stateToken(phase: string) {
  // Just a deterministic-looking opaque token so the line reads as real.
  const seed = phase.charCodeAt(0) + phase.length;
  return `oa_${seed}f8q${(seed * 31).toString(36)}…`;
}
