import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Eye, EyeOff, Mail, KeyRound, ArrowRight, Building2, AlertCircle,
} from 'lucide-react';
import { env } from '@shared/config/env';
import { signUpWithPassword, signInWithProvider, type OAuthProvider } from '@entities/session';
import { GithubIcon } from '@shared/ui/brand-icons';
import { AuthShell } from './parts/AuthShell';
import { Field, Button, HRule } from './parts/AuthForm';
import { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
import { PasswordStrengthPanel } from './parts/PasswordStrengthPanel';
import { evaluatePassword } from './lib/passwordRules';
import { lookupIdP, PROVIDER_LABEL } from './lib/idpDirectory';
import { formatTime } from '@shared/i18n';

type Step = 'form' | 'submitting' | 'sent';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [oauth, setOauth] = useState<null | 'github' | 'gitlab' | 'google'>(null);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  // Honor the guard's ?redirect= (same-app paths only) so a new invitee who
  // signs up from an /accept-invitation link returns there — mirrors SignInPage.
  const rawRedirect = useMemo(() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    return r?.startsWith('/') ? r : null;
  }, []);
  const destAfterSignup = rawRedirect ?? '/intelligence';

  const report = useMemo(() => evaluatePassword(pw, name), [pw, name]);
  const idp = useMemo(() => (email.includes('@') ? lookupIdP(email) : null), [email]);

  const emailError = touchedEmail && email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ? 'Use a complete email like name@company.com'
    : undefined;

  const canSubmit =
    name.trim().length > 0
    && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    && report.score >= 3
    && !report.breached
    && agreed;

  useEffect(() => {
    if (step !== 'submitting') return;
    const id = setTimeout(() => { setStep('sent'); }, 900);
    return () => { clearTimeout(id); };
  }, [step]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Real auth: create the account (dev auto-signs-in; prod requires email
    // verification, in which case the guard bounces to login until verified).
    if (env.useRealAuth) {
      setError(null);
      setStep('submitting');
      void (async () => {
        const r = await signUpWithPassword({ email, password: pw, name });
        if (r.ok) await navigate({ to: destAfterSignup as never });
        else { setStep('form'); setError(r.error); }
      })();
      return;
    }

    setStep('submitting');
  };

  // Real OAuth — social sign-in is also sign-up. Brand-new OAuth users are routed
  // to onboarding (newUserCallbackURL); an existing account lands on the dest.
  const startOauth = (provider: OAuthProvider) => {
    setError(null);
    void (async () => {
      const r = await signInWithProvider(provider, {
        callbackURL: `${window.location.origin}${destAfterSignup}`,
        newUserCallbackURL: `${window.location.origin}/onboarding`,
        errorCallbackURL: `${window.location.origin}/auth/signup`,
      });
      if (!r.ok) { setStep('form'); setError(r.error); }
    })();
  };

  // SSO-enforced org? Steer them to /auth/sso instead of letting them create
  // a duplicate account.
  if (idp?.enforced && touchedEmail) {
    return (
      <AuthShell
        title={`${idp.org} uses SSO`}
        subtitle="Your organization manages accounts through their identity provider, so there's no separate signup."
        topRight={<Link to={'/auth/login' as never} search={rawRedirect ? ({ redirect: rawRedirect } as never) : undefined} style={{ color: 'var(--fg-link)' }}>Sign in</Link>}
        footer={
          <>
            <span>Different organization?</span>
            <button
              type="button"
              onClick={() => { setEmail(''); setTouchedEmail(false); }}
              style={{ color: 'var(--fg-link)' }}
            >
              Use another email
            </button>
          </>
        }
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', border: '1px solid var(--fg-accent)' }}
        >
          <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
          <div className="flex flex-col gap-0.5 text-base leading-snug">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Identity provider: {PROVIDER_LABEL[idp.provider]}
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              Sign in with your <span className="font-mono">{idp.domain}</span> credentials —
              we&apos;ll create your se · field account on the way.
            </span>
          </div>
        </div>

        <Link
          to={'/auth/sso' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold w-full"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Continue with SSO
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </AuthShell>
    );
  }

  if (step === 'sent') {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We sent a verification link to ${email}. Click it to finish setting up your account.`}
        footer={
          <>
            <span>Didn&apos;t get it?</span>
            <button type="button" onClick={() => { setStep('form'); }} style={{ color: 'var(--fg-link)' }}>
              Resend or use a different email
            </button>
          </>
        }
      >
        <div
          className="flex flex-col items-center gap-4 py-4"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' }}
          >
            <Mail className="w-5 h-5" style={{ color: 'var(--fg-accent)' }} />
          </div>
          <div
            className="text-sm font-mono tabular-nums px-3 py-1.5 rounded"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-muted)',
            }}
          >
            sent · {formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <>
      <AuthShell
        title="Create your account"
        subtitle="Start with a free workspace. You can invite teammates next."
        topRight={
          <span>Already have an account?{' '}
            <Link to={'/auth/login' as never} search={rawRedirect ? ({ redirect: rawRedirect } as never) : undefined} style={{ color: 'var(--fg-link)' }}>Sign in</Link>
          </span>
        }
        footer={
          <span>Free for individuals · Team plan starts at $20/seat/mo</span>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field
            label="Full name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            placeholder="Sora Kim"
            required
          />
          <Field
            label="Work email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            onBlur={() => { setTouchedEmail(true); }}
            placeholder="you@company.com"
            error={emailError}
            required
          />

          {/* Soft suggestion when domain is known but SSO not enforced. */}
          {idp && !idp.enforced && (
            <div
              className="text-sm flex items-start gap-2 -mt-2 px-2.5 py-1.5 rounded onb-stagger"
              style={{
                background: 'var(--bg-surface-muted)',
                color: 'var(--fg-muted)',
                border: '1px solid var(--border-muted)',
              }}
            >
              <Building2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
              <span>
                {idp.org} also uses {PROVIDER_LABEL[idp.provider]} —{' '}
                <Link to={'/auth/sso' as never} style={{ color: 'var(--fg-link)' }}>
                  use SSO instead?
                </Link>
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Field
              label="Password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); }}
              placeholder="At least 12 characters"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => { setShowPw((v) => !v); }}
                  className="p-1 rounded-md"
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              }
            />
            {pw.length > 0 && <PasswordStrengthPanel report={report} />}
          </div>

          <TermsCheck checked={agreed} onChange={setAgreed} />

          {error && (
            <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--intent-danger-fg)' }} role="alert">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" disabled={!canSubmit || step === 'submitting'}>
            {step === 'submitting' ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        {/* Real OAuth (GitHub/Google) — social sign-in doubles as sign-up for a
            new user. GitLab is not backed, so only these two show in real mode. */}
        {env.useRealAuth && (
          <>
            <HRule />
            <div className="flex flex-col gap-2">
              <Button variant="secondary" leading={<GithubIcon className="w-3.5 h-3.5" />} onClick={() => { startOauth('github'); }}>
                Continue with GitHub
              </Button>
              <Button variant="secondary" leading={<Mail className="w-3.5 h-3.5" />} onClick={() => { startOauth('google'); }}>
                Continue with Google
              </Button>
            </div>
          </>
        )}

        {/* OAuth is mock-only (fakes success) in the standalone demo. */}
        {!env.useRealAuth && (
          <>
            <HRule />

            <div className="flex flex-col gap-2">
              <Button variant="secondary" leading={<GithubIcon className="w-3.5 h-3.5" />} onClick={() => { setOauth('github'); }}>
                Continue with GitHub
              </Button>
              <Button variant="secondary" leading={<GitLabMark />} onClick={() => { setOauth('gitlab'); }}>
                Continue with GitLab
              </Button>
              <Button variant="secondary" leading={<Mail className="w-3.5 h-3.5" />} onClick={() => { setOauth('google'); }}>
                Continue with Google
              </Button>
            </div>
          </>
        )}
      </AuthShell>

      {oauth && (
        <OAuthRedirectOverlay
          provider={oauth}
          onCancel={() => { setOauth(null); }}
          onComplete={() => { setOauth(null); setStep('sent'); }}
        />
      )}
    </>
  );
}

function GitLabMark() {
  return (
    <span
      className="w-3.5 h-3.5 rounded-sm inline-flex items-center justify-center text-2xs font-black"
      style={{ background: 'var(--fg-default)', color: 'var(--bg-canvas)' }}
    >
      GL
    </span>
  );
}

function TermsCheck({
  checked, onChange,
}: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <span
        className="relative w-4 h-4 rounded shrink-0 mt-0.5 transition-colors"
        style={{
          background: checked ? 'var(--fg-accent)' : 'transparent',
          border: `1.5px solid ${checked ? 'var(--fg-accent)' : 'var(--border-strong)'}`,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => { onChange(e.target.checked); }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {checked && (
          <svg className="w-full h-full p-0.5" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6 L5 8.5 L9.5 4"
              stroke="var(--bg-canvas)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="12"
              style={{ animation: 'onb-checkmark 280ms ease-out both' }}
            />
          </svg>
        )}
      </span>
      <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
        I agree to the{' '}
        <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Terms of Service</button>
        {' '}and{' '}
        <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Privacy Policy</button>.
        {' '}I understand this app indexes my code and my AI usage may be billed.
      </span>
    </label>
  );
}
