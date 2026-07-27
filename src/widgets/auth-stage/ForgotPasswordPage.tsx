import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Trans, useTranslation } from 'react-i18next';
import {
  Mail, ShieldCheck, Clock, Building2, KeyRound, Info,
} from 'lucide-react';
import { env } from '@shared/config/env';
import { requestPasswordReset } from '@entities/session';
import { AuthShell } from './parts/AuthShell';
import { AuthField as Field, AuthButton as Button } from '@shared/ui/forms';
import { useRateLimit } from './lib/rateLimit';
import { lookupIdP, PROVIDER_LABEL } from './lib/idpDirectory';

const RESEND_COOLDOWN_MS = 60_000;

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<'form' | 'sending' | 'sent'>('form');
  const [now, setNow] = useState(() => Date.now());
  const [lastSent, setLastSent] = useState<number | null>(null);

  // Separate rate limit from sign-in: 5 requests / hour. Anonymous so we don't
  // tip off whether the email exists; same response either way.
  const rate = useRateLimit({
    maxFails: 5,
    windowMs: 60 * 60 * 1000,
    cooldownMs: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (phase !== 'sent') return;
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(id); };
  }, [phase]);

  const idp = email.includes('@') ? lookupIdP(email) : null;
  const cooldownLeft = lastSent ? Math.max(0, Math.ceil((lastSent + RESEND_COOLDOWN_MS - now) / 1000)) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rate.lockedUntil) return;

    setPhase('sending');

    // Real auth: fire the reset request; always show 'sent' regardless of the
    // result (privacy — never reveal whether the email exists). The email link
    // points back at this FE's /auth/reset.
    if (env.useRealAuth) {
      void requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset`,
      }).finally(() => {
        rate.recordFail();
        setLastSent(Date.now());
        setPhase('sent');
      });
      return;
    }

    setTimeout(() => {
      // We always claim success — never reveal whether the email exists.
      // recordFail counts as "an attempt was made"; we use it for rate-limit.
      rate.recordFail();
      setLastSent(Date.now());
      setPhase('sent');
    }, 700);
  };

  if (rate.lockedUntil) {
    return (
      <AuthShell
        title={t('forgot.throttled.title')}
        subtitle={t('forgot.throttled.subtitle')}
        footer={<><span>{t('common.needHelp')}</span><Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>{t('common.contactSupport')}</Link></>}
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          <div className="flex flex-col gap-0.5 text-sm leading-snug">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('forgot.throttled.bannerTitle', { min: Math.floor(rate.cooldownSec / 60) })}
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              {t('forgot.throttled.bannerBody')}
            </span>
          </div>
        </div>
      </AuthShell>
    );
  }

  // SSO-enforced org → reset has to happen at the IdP, not here.
  if (idp?.enforced && phase === 'form' && email.includes('@')) {
    return (
      <AuthShell
        title={t('forgot.idpManaged.title')}
        subtitle={t('forgot.idpManaged.subtitle', { org: idp.org, provider: PROVIDER_LABEL[idp.provider] })}
        footer={<><span>{t('forgot.idpManaged.differentAccount')}</span><button type="button" onClick={() => { setEmail(''); }} style={{ color: 'var(--fg-link)' }}>{t('forgot.idpManaged.useAnotherEmail')}</button></>}
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
          style={{ background: 'color-mix(in srgb, var(--fg-accent) 14%, transparent)', border: '1px solid var(--fg-accent)' }}
        >
          <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
          <div className="flex flex-col gap-0.5 text-sm leading-snug">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('forgot.idpManaged.bannerTitle', { org: idp.org })}
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              {t('forgot.idpManaged.bannerBody', { provider: PROVIDER_LABEL[idp.provider] })}
            </span>
          </div>
        </div>
        <Link
          to={'/auth/sso' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold w-full"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <KeyRound className="w-3.5 h-3.5" />
          {t('common.signInWithSso')}
        </Link>
      </AuthShell>
    );
  }

  if (phase === 'sent') {
    return (
      <AuthShell
        title={t('forgot.sent.title')}
        subtitle={t('forgot.sent.subtitle', { email })}
        footer={
          <><span>{t('forgot.sent.rememberedPassword')}</span>
          <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>{t('forgot.sent.signIn')}</Link></>
        }
      >
        <SentPanel email={email} cooldownLeft={cooldownLeft} onResend={() => {
          if (cooldownLeft > 0) return;
          setLastSent(Date.now());
          rate.recordFail();
        }} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <><span>{t('forgot.rememberedIt')}</span>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>{t('forgot.backToSignIn')}</Link></>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field
          label={t('forgot.workEmail')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder={t('forgot.emailPlaceholder')}
          required
          autoFocus
        />

        {idp && !idp.enforced && (
          <div
            className="text-sm flex items-start gap-2 px-2.5 py-1.5 rounded onb-stagger"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            <span>
              {t('forgot.orgUsesSso', { org: idp.org, provider: PROVIDER_LABEL[idp.provider] })}
              <Link to={'/auth/sso' as never} style={{ color: 'var(--fg-link)' }}>
                {t('forgot.signInWithSsoLink')}
              </Link>
              {t('forgot.instead')}
            </span>
          </div>
        )}

        <Button
          type="submit"
          leading={<Mail className="w-3.5 h-3.5" />}
          disabled={phase === 'sending'}
        >
          {phase === 'sending' ? t('forgot.sending') : t('forgot.sendResetLink')}
        </Button>

        <PrivacyNote attempts={rate.attempts} />
      </form>
    </AuthShell>
  );
}

function SentPanel({
  email, cooldownLeft, onResend,
}: { email: string; cooldownLeft: number; onResend: () => void }) {
  const { t } = useTranslation('auth');
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-start gap-3 px-3 py-3 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-success-fg)' }} />
        <div className="flex flex-col gap-1 text-sm leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {t('forgot.sent.requestProcessed')}
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            <Trans
              i18nKey="forgot.sent.subjectFrom"
              t={t}
              components={[
                <span key="0" style={{ color: 'var(--fg-default)' }} />,
                <span key="1" className="font-mono" />,
              ]}
            />
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: 'var(--fg-muted)' }}>
          {t('forgot.sent.whatToExpect')}
        </span>
        <ul className="flex flex-col gap-1 pl-1">
          {[
            { ok: true,  text: t('forgot.sent.line1') },
            { ok: true,  text: t('forgot.sent.line2') },
            { ok: true,  text: t('forgot.sent.line3') },
            { ok: false, text: t('forgot.sent.line4') },
          ].map((line, i) => (
            <li key={i} className="flex items-start gap-1.5" style={{ color: 'var(--fg-default)' }}>
              <span
                className="inline-block w-1 h-1 rounded-full mt-[7px] shrink-0"
                style={{ background: line.ok ? 'var(--intent-success-fg)' : 'var(--fg-subtle)' }}
                aria-hidden
              />
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onResend}
        disabled={cooldownLeft > 0}
        className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium transition-colors"
        style={{
          background: 'transparent',
          color: cooldownLeft > 0 ? 'var(--fg-subtle)' : 'var(--fg-link)',
          border: '1px solid var(--border-default)',
          cursor: cooldownLeft > 0 ? 'default' : 'pointer',
        }}
      >
        {cooldownLeft > 0 ? <Clock className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
        {cooldownLeft > 0 ? t('forgot.sent.resendIn', { sec: cooldownLeft }) : t('forgot.sent.resendEmail')}
      </button>

      <p className="text-xs leading-snug" style={{ color: 'var(--fg-subtle)' }}>
        <Trans
          i18nKey="forgot.sent.securityNote"
          t={t}
          values={{ email }}
          components={[<span key="0" className="font-mono" />]}
        />
      </p>
    </div>
  );
}

function PrivacyNote({ attempts }: { attempts: number }) {
  const { t } = useTranslation('auth');
  return (
    <div
      className="flex items-start gap-2 text-xs leading-snug"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <Info className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        {t('forgot.privacyNote')}
        {attempts > 0 && (
          <Trans
            i18nKey="forgot.attemptsMade"
            t={t}
            values={{ attempts }}
            components={[<span key="0" style={{ color: 'var(--fg-default)' }} />]}
          />
        )}
      </span>
    </div>
  );
}
