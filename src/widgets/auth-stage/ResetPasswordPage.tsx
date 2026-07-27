import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Eye, EyeOff, Check, Clock, ShieldCheck, AlertCircle, KeyRound,
} from 'lucide-react';
import { env } from '@shared/config/env';
import { resetPassword } from '@entities/session';
import { AuthShell } from './parts/AuthShell';
import { AuthField as Field, AuthButton as Button } from '@shared/ui/forms';
import { PasswordStrengthPanel, evaluatePassword } from '@features/password-strength';
import { formatTime } from '@shared/i18n';

type Phase = 'form' | 'submitting' | 'success' | 'token-invalid';

// Demo token expires 28 minutes from page load. In real life this is parsed
// from the URL — `useSearch().token`.
const TOKEN_TTL_SEC = 28 * 60;

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  // Reset token from the email link (?token=). Read once from the URL.
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get('token') ?? '',
    [],
  );

  // Token countdown — purely visual; expiry would be enforced server-side.
  const [expiresAt] = useState(() => Date.now() + TOKEN_TTL_SEC * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase === 'success') return;
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(id); };
  }, [phase]);

  const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));
  if (remainingSec === 0 && phase !== 'success' && phase !== 'token-invalid') {
    setPhase('token-invalid');
  }

  const report = useMemo(() => evaluatePassword(pw), [pw]);
  const mismatch = confirm.length > 0 && pw !== confirm;
  // Client-side minimum bar only — the backend has the final say on the reset.
  const ready = report.meetsPolicy && pw === confirm;

  if (phase === 'token-invalid') {
    return (
      <AuthShell
        title={t('reset.expired.title')}
        subtitle={t('reset.expired.subtitle')}
        footer={<><span>{t('common.needHelp')}</span><Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>{t('common.contactSupport')}</Link></>}
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          <span className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
            {t('reset.expired.body')}
          </span>
        </div>
        <Link
          to={'/auth/forgot' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold w-full"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          {t('reset.expired.requestNew')}
        </Link>
      </AuthShell>
    );
  }

  if (phase === 'success') {
    return <ResetSuccess />;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setPhase('submitting');

    // Real auth: submit the new password with the URL token.
    if (env.useRealAuth) {
      setError(null);
      void (async () => {
        const r = await resetPassword({ newPassword: pw, token });
        if (r.ok) setPhase('success');
        else { setPhase('form'); setError(r.error); }
      })();
      return;
    }

    setTimeout(() => { setPhase('success'); }, 900);
  };

  return (
    <AuthShell
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      topRight={<TokenStatus remainingSec={remainingSec} />}
      footer={
        <><span>{t('reset.wrongAccount')}</span>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>{t('reset.backToSignIn')}</Link></>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-2.5">
          <Field
            label={t('reset.newPassword')}
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); }}
            placeholder={t('reset.passwordPlaceholder')}
            required
            autoFocus
            trailing={
              <button
                type="button"
                onClick={() => { setShowPw((v) => !v); }}
                className="p-1 rounded-md"
                style={{ color: 'var(--fg-muted)' }}
                aria-label={showPw ? t('common.hidePassword') : t('common.showPassword')}
              >
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
          {pw.length > 0 && <PasswordStrengthPanel report={report} />}
        </div>

        <Field
          label={t('reset.confirmPassword')}
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); }}
          error={mismatch ? t('reset.passwordsDoNotMatch') : undefined}
          required
          trailing={
            confirm.length > 0 && !mismatch && (
              <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
            )
          }
        />

        <SignOutNotice />

        {error && (
          <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--intent-danger-fg)' }} role="alert">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={!ready || phase === 'submitting'}>
          {phase === 'submitting' ? t('reset.updating') : t('reset.updateAndSignIn')}
        </Button>
      </form>
    </AuthShell>
  );
}

function TokenStatus({ remainingSec }: { remainingSec: number }) {
  const { t } = useTranslation('auth');
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const low = remainingSec < 60;
  return (
    <span className="inline-flex items-center gap-1">
      <Clock className="w-3 h-3" style={{ color: low ? 'var(--intent-danger-fg)' : 'var(--fg-subtle)' }} />
      {t('reset.tokenExpiresIn')}
      <span
        className="font-mono tabular-nums"
        style={{ color: low ? 'var(--intent-danger-fg)' : 'var(--fg-default)' }}
      >
        {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
      </span>
    </span>
  );
}

function SignOutNotice() {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex items-start gap-2 text-sm px-2.5 py-2 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
      <span style={{ color: 'var(--fg-muted)' }}>
        {t('reset.signOutNotice')}
      </span>
    </div>
  );
}

function ResetSuccess() {
  const { t } = useTranslation('auth');
  // Auto-redirect timer — visible 5s countdown so the user knows what'll happen.
  const [secLeft, setSecLeft] = useState(5);
  useEffect(() => {
    if (secLeft === 0) return;
    const id = setTimeout(() => { setSecLeft((s) => s - 1); }, 1000);
    return () => { clearTimeout(id); };
  }, [secLeft]);

  return (
    <AuthShell
      title={t('reset.success.title')}
      subtitle={t('reset.success.subtitle')}
      footer={<span>{t('reset.success.footer')}<button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>{t('reset.success.accountSecurity')}</button>{t('reset.success.footerRest')}</span>}
    >
      <div className="flex flex-col items-center gap-5 py-2">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--intent-success-bg)' }}
        >
          <KeyRound className="w-5 h-5" style={{ color: 'var(--intent-success-fg)' }} />
        </div>

        <dl
          className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-3 py-2.5 rounded-md text-sm"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <Row label={t('reset.success.updated')}        value={formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })} />
          <Row label={t('reset.success.sessionsEnded')} value={t('reset.success.sessionsEndedValue')} />
          <Row label={t('reset.success.twoFaReset')}      value={t('reset.success.twoFaResetValue')} />
          <Row label={t('reset.success.notification')}   value={t('reset.success.notificationValue')} />
        </dl>

        <Link
          to={'/auth/login' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold w-full"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          {t('reset.success.signInNow')} {secLeft > 0 && <span className="opacity-60">{t('reset.success.autoIn', { sec: secLeft })}</span>}
        </Link>

        {secLeft === 0 && (
          <p className="text-xs onb-stagger" style={{ color: 'var(--fg-subtle)' }}>
            {t('reset.success.autoRedirectCanceled')}
          </p>
        )}
      </div>
    </AuthShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-2xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </dt>
      <dd style={{ color: 'var(--fg-default)' }}>{value}</dd>
    </div>
  );
}
