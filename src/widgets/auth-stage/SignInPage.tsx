import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  Eye, EyeOff, Mail, KeyRound, Lock, AlertCircle, Sparkles, Check,
} from 'lucide-react';
import { env } from '@shared/config/env';
import { safeHref } from '@shared/lib';
import { signInWithPassword, signInWithProvider, type OAuthProvider } from '@entities/session';
import { resolveSso } from '@entities/org';
import { GithubIcon } from '@shared/ui/brand-icons';
import { AuthShell } from './parts/AuthShell';
import { AuthField as Field, AuthButton as Button, AuthHRule as HRule } from '@shared/ui/forms';
import { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
import { useRateLimit } from './lib/rateLimit';
import { lookupIdP, PROVIDER_LABEL } from './lib/idpDirectory';
import type { IdPProvider } from './lib/idpDirectory';
import { getLastUsedMethod, setLastUsedMethod, type AuthMethod } from './lib/lastUsed';

// Demo credentials so reviewers can deterministically reach success vs.
// failure paths. Real auth is unmocked; this is just to drive the lockout
// demo and the magic-link branch without a backend.
const DEMO_PASSWORD = 'sefield-demo';
const MAGIC_LINK_EMAIL_HINT = 'magic';   // any email containing this string falls back to magic link

type Mode = 'password' | 'magic-link';

export default function SignInPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState<Mode>('password');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [oauth, setOauth] = useState<null | 'github' | 'gitlab' | 'google' | 'sso'>(null);

  const navigate = useNavigate();
  // Guard stashes the intended destination as ?redirect=. Only honor same-app
  // paths (leading '/') to avoid an open redirect.
  const rawRedirect = useMemo(() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    return r?.startsWith('/') ? r : null;
  }, []);
  const destAfterLogin = rawRedirect ?? '/intelligence';
  const rate = useRateLimit({ maxFails: 3, cooldownMs: 60_000 });
  const lastUsed = useMemo(() => getLastUsedMethod(), []);
  const idp = useMemo(() => (email.includes('@') ? lookupIdP(email) : null), [email]);

  // Auto-suggest SSO when the typed email maps to a known org with enforced SSO.
  // Mock-only: the idp directory is demo data, so it must not drive the real
  // password login path (which would block sign-in for demo domains).
  const ssoEnforced = !env.useRealAuth && idp?.enforced;

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (rate.lockedUntil) return;

    // Real auth: hit the accounts backend (better-auth). On success the session
    // cookie is set; navigate into the app (the route guard re-checks the warm
    // session). If the account has a second factor, the session isn't live yet —
    // route to the MFA challenge (carrying ?redirect= so it lands correctly).
    if (env.useRealAuth) {
      setError(null);
      void (async () => {
        const r = await signInWithPassword({ email, password: pw });
        if (!r.ok) { setError(r.error); return; }
        setLastUsedMethod('password');
        if (r.twoFactorRedirect) {
          await navigate(rawRedirect
            ? { to: '/auth/mfa' as never, search: { redirect: rawRedirect } as never }
            : { to: '/auth/mfa' as never });
        } else {
          await navigate({ to: destAfterLogin as never });
        }
      })();
      return;
    }

    if (mode === 'magic-link' || email.toLowerCase().includes(MAGIC_LINK_EMAIL_HINT)) {
      setSuccessMessage(t('signIn.magicLinkSent', { email }));
      setLastUsedMethod('magic-link');
      return;
    }

    if (pw === DEMO_PASSWORD) {
      rate.recordSuccess();
      setLastUsedMethod('password');
      setSuccessMessage(t('signIn.signedInRedirecting'));
      setError(null);
    } else {
      rate.recordFail();
      const left = Math.max(0, rate.remaining - 1);
      setError(left === 0
        ? t('signIn.lockedOut')
        : t('signIn.wrongPassword', { count: left }));
    }
  };

  const oauthFinish = (m: AuthMethod) => {
    setLastUsedMethod(m);
    setOauth(null);
    setSuccessMessage(t('signIn.signedInRedirecting'));
  };

  // Real OAuth — better-auth redirects the browser to the provider; control only
  // returns here on an immediate error. callbackURL carries the post-login dest.
  const startOauth = (provider: OAuthProvider) => {
    setError(null);
    setLastUsedMethod(provider === 'github' ? 'oauth-github' : 'oauth-google');
    void (async () => {
      const r = await signInWithProvider(provider, {
        callbackURL: `${window.location.origin}${destAfterLogin}`,
        errorCallbackURL: `${window.location.origin}/auth/login`,
      });
      if (!r.ok) setError(r.error);
    })();
  };

  // Real SSO — resolve the email's org connection, then send the browser to the
  // server's authorize entry point (it mints state/PKCE/nonce and 302s to the IdP).
  // No SSO for the domain → hint to use the password path instead.
  const startSso = () => {
    const em = email.trim();
    if (!em.includes('@')) { setError(t('signIn.ssoEnterEmail')); return; }
    setError(null);
    void (async () => {
      const r = await resolveSso(em);
      // Guard the server-provided IdP URL against scheme injection before we
      // hand the browser to it (a compromised/MITM'd backend could return a
      // javascript: URL). safeHref allows only http(s).
      const dest = r.sso && r.authorizationUrl ? safeHref(r.authorizationUrl) : undefined;
      if (dest) { window.location.href = dest; }
      else { setError(t('signIn.ssoNotConfigured')); }
    })();
  };

  return (
    <>
      <AuthShell
        title={t('signIn.title')}
        subtitle={t('signIn.subtitle')}
        topRight={lastUsed ? <LastUsedHint method={lastUsed} /> : undefined}
        footer={
          <>
            <span>{t('signIn.newToBrand')}</span>
            <Link
              to={'/auth/signup' as never}
              search={rawRedirect ? ({ redirect: rawRedirect } as never) : undefined}
              style={{ color: 'var(--fg-link)' }}
            >
              {t('signIn.createAccount')}
            </Link>
          </>
        }
      >
        {rate.lockedUntil && <LockoutBanner cooldownSec={rate.cooldownSec} />}
        {ssoEnforced && idp && <SsoEnforcedBanner orgName={idp.org} provider={idp.provider} />}

        <form className="flex flex-col gap-4" onSubmit={submitPassword}>
          <Field
            ref={inputRef}
            label={t('signIn.workEmail')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder={t('signIn.emailPlaceholder')}
            required
            disabled={Boolean(rate.lockedUntil)}
          />

          {mode === 'password' && !ssoEnforced && (
            <Field
              label={t('signIn.password')}
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(null); }}
              hint={t('signIn.forgotPassword')}
              hintTo="/auth/forgot"
              placeholder={t('signIn.passwordPlaceholder')}
              required
              disabled={Boolean(rate.lockedUntil)}
              error={error ?? undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => { setShowPw((v) => !v); }}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label={showPw ? t('common.hidePassword') : t('common.showPassword')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              }
            />
          )}

          {ssoEnforced && idp ? (
            <Button
              onClick={() => { setOauth('sso'); }}
              leading={<KeyRound className="w-3.5 h-3.5" />}
            >
              {t('signIn.continueWith', { provider: PROVIDER_LABEL[idp.provider] })}
            </Button>
          ) : (
            <Button type="submit" disabled={Boolean(rate.lockedUntil)}>
              {mode === 'magic-link' ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('signIn.emailSignInLink')}
                </span>
              ) : t('common.signIn')}
            </Button>
          )}

          {!ssoEnforced && !env.useRealAuth && (
            <button
              type="button"
              onClick={() => { setMode((m) => (m === 'password' ? 'magic-link' : 'password')); setError(null); }}
              className="self-start text-sm font-medium"
              style={{ color: 'var(--fg-link)' }}
            >
              {mode === 'password'
                ? t('signIn.getOneTimeLink')
                : t('signIn.usePasswordInstead')}
            </button>
          )}

          {successMessage && <SuccessNote message={successMessage} />}
        </form>

        {/* Real OAuth (GitHub/Google) — the accounts backend has these providers
            when the client-ids are configured. GitLab/SSO/magic-link are not
            backed, so only these two show in real mode. */}
        {env.useRealAuth && (
          <>
            <HRule />
            <div className="flex flex-col gap-2">
              <OauthButton
                label={t('signIn.continueWithGithub')}
                leading={<GithubIcon className="w-3.5 h-3.5" />}
                highlight={lastUsed === 'oauth-github'}
                onClick={() => { startOauth('github'); }}
              />
              <OauthButton
                label={t('signIn.continueWithGoogle')}
                leading={<Mail className="w-3.5 h-3.5" />}
                highlight={lastUsed === 'oauth-google'}
                onClick={() => { startOauth('google'); }}
              />
              <OauthButton
                label={t('signIn.continueWithSso')}
                leading={<KeyRound className="w-3.5 h-3.5" />}
                highlight={false}
                onClick={startSso}
              />
            </div>
          </>
        )}

        {/* Mock-only affordances (SSO / magic-link / GitLab / demo creds): they
            fake success in the standalone demo and aren't backed by real auth. */}
        {!env.useRealAuth && (
          <>
            <HRule />

            <div className="flex flex-col gap-2">
              <OauthButton
                label={t('signIn.continueWithGithub')}
                leading={<GithubIcon className="w-3.5 h-3.5" />}
                highlight={lastUsed === 'oauth-github'}
                onClick={() => { setOauth('github'); }}
              />
              <OauthButton
                label={t('signIn.continueWithGitlab')}
                leading={<GitLabMark />}
                highlight={lastUsed === 'oauth-gitlab'}
                onClick={() => { setOauth('gitlab'); }}
              />
              <OauthButton
                label={t('signIn.continueWithGoogle')}
                leading={<Mail className="w-3.5 h-3.5" />}
                highlight={lastUsed === 'oauth-google'}
                onClick={() => { setOauth('google'); }}
              />
              <Link
                to={'/auth/sso' as never}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold tracking-tight transition-colors w-full"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-strong)',
                  border: '1px solid var(--border-default)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {t('signIn.continueWithSso')}
                {lastUsed === 'sso' && <LastBadge />}
              </Link>
            </div>

            <DemoCredHint />
          </>
        )}
      </AuthShell>

      {oauth && (
        <OAuthRedirectOverlay
          provider={oauth}
          onCancel={() => { setOauth(null); }}
          onComplete={() => {
            const method: AuthMethod =
              oauth === 'github' ? 'oauth-github'
              : oauth === 'gitlab' ? 'oauth-gitlab'
              : oauth === 'google' ? 'oauth-google'
              : 'sso';
            oauthFinish(method);
          }}
        />
      )}
    </>
  );
}

function OauthButton({
  label, leading, highlight, onClick,
}: { label: string; leading: React.ReactNode; highlight: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold tracking-tight transition-colors w-full"
      style={{
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-strong)',
        border: `1px solid ${highlight ? 'var(--fg-accent)' : 'var(--border-default)'}`,
        boxShadow: highlight ? '0 0 0 3px color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface-muted)'; }}
    >
      {leading}
      {label}
      {highlight && <LastBadge />}
    </button>
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

function LastBadge() {
  const { t } = useTranslation('auth');
  return (
    <span
      className="ml-auto text-2xs font-bold uppercase tracking-eyebrow px-1.5 py-0.5 rounded"
      style={{ background: 'var(--fg-accent)', color: 'var(--bg-canvas)' }}
    >
      {t('signIn.lastUsed')}
    </span>
  );
}

function LastUsedHint({ method }: { method: AuthMethod }) {
  const { t } = useTranslation('auth');
  const label =
    method === 'password'      ? t('signIn.method.password')
    : method === 'oauth-github' ? t('signIn.method.github')
    : method === 'oauth-gitlab' ? t('signIn.method.gitlab')
    : method === 'oauth-google' ? t('signIn.method.google')
    : method === 'sso'          ? t('signIn.method.sso')
    : t('signIn.method.magicLink');
  return (
    <Trans
      i18nKey="signIn.lastSignedInWith"
      t={t}
      values={{ method: label }}
      components={[<span key="0" style={{ color: 'var(--fg-default)' }} />]}
    />
  );
}

function LockoutBanner({ cooldownSec }: { cooldownSec: number }) {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-danger-bg)',
        border: '1px solid var(--intent-danger-fg)',
      }}
      role="alert"
    >
      <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-danger-fg)' }} />
      <div className="flex flex-col gap-1 text-sm leading-snug flex-1">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t('signIn.lockout.title')}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {t('signIn.lockout.body')}
          <span className="font-mono tabular-nums" style={{ color: 'var(--intent-danger-fg)' }}>
            {String(Math.floor(cooldownSec / 60)).padStart(2, '0')}
            :
            {String(cooldownSec % 60).padStart(2, '0')}
          </span>
          {t('signIn.lockout.bodyRest')}
        </span>
      </div>
    </div>
  );
}

function SsoEnforcedBanner({ orgName, provider }: { orgName: string; provider: IdPProvider }) {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', border: '1px solid var(--fg-accent)' }}
    >
      <KeyRound className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
      <div className="flex flex-col gap-0.5 text-sm leading-snug flex-1">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {t('signIn.ssoEnforced.title', { org: orgName })}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          <Trans
            i18nKey="signIn.ssoEnforced.body"
            t={t}
            values={{ provider: PROVIDER_LABEL[provider] }}
            components={[<span key="0" style={{ color: 'var(--fg-default)' }} />]}
          />
        </span>
      </div>
    </div>
  );
}

function SuccessNote({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 text-sm onb-stagger"
      style={{ color: 'var(--intent-success-fg)' }}
      role="status"
    >
      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function DemoCredHint() {
  const { t } = useTranslation('auth');
  return (
    <div
      className="text-xs flex items-start gap-2 px-3 py-2 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px dashed var(--border-default)',
        color: 'var(--fg-subtle)',
      }}
    >
      <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        <span className="font-semibold" style={{ color: 'var(--fg-muted)' }}>{t('signIn.demo.label')}</span>{' '}
        <Trans
          i18nKey="signIn.demo.body"
          t={t}
          components={[
            <span key="0" className="font-mono" style={{ color: 'var(--fg-default)' }} />,
            <span key="1" className="font-mono" />,
            <span key="2" className="font-mono" />,
          ]}
        />
      </span>
    </div>
  );
}
