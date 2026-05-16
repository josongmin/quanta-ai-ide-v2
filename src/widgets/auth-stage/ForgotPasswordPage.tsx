import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Mail, ShieldCheck, Clock, Building2, KeyRound, Info,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';
import { Field, Button } from './parts/AuthForm';
import { useRateLimit } from './lib/rateLimit';
import { lookupIdP, PROVIDER_LABEL } from './lib/idpDirectory';

const RESEND_COOLDOWN_MS = 60_000;

export default function ForgotPasswordPage() {
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
        title="Too many reset requests"
        subtitle="For security, we've paused reset requests from this device. Try again later or contact your admin."
        footer={<><span>Need help?</span><button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Contact support</button></>}
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Reset throttled · retry in {Math.floor(rate.cooldownSec / 60)} min
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              We allow up to 5 reset requests per hour per device. This protects your account from spam attacks.
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
        title="Password reset is managed by your IdP"
        subtitle={`${idp.org} uses ${PROVIDER_LABEL[idp.provider]} for sign-in, so passwords are managed there.`}
        footer={<><span>Different account?</span><button type="button" onClick={() => { setEmail(''); }} style={{ color: 'var(--fg-link)' }}>Use another email</button></>}
      >
        <div
          className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
          style={{ background: 'var(--brand-bg)', border: '1px solid var(--brand-vivid)' }}
        >
          <Building2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-fg)' }} />
          <div className="flex flex-col gap-0.5 text-[11px] leading-snug">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Reset your {idp.org} password
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              Use {PROVIDER_LABEL[idp.provider]} or your IT admin&apos;s self-service portal. After resetting, sign back in here with SSO.
            </span>
          </div>
        </div>
        <Link
          to={'/auth/sso' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-semibold w-full"
          style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Sign in with SSO
        </Link>
      </AuthShell>
    );
  }

  if (phase === 'sent') {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${email}, we've sent a password reset link. The link expires in 30 minutes.`}
        footer={
          <><span>Remembered your password?</span>
          <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>Sign in</Link></>
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
      title="Reset your password"
      subtitle="Enter the email associated with your account. If it exists, we'll send a link to reset your password."
      footer={
        <><span>Remembered it?</span>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>Back to sign in</Link></>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Field
          label="Work email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); }}
          placeholder="you@company.com"
          required
          autoFocus
        />

        {idp && !idp.enforced && (
          <div
            className="text-[11px] flex items-start gap-2 px-2.5 py-1.5 rounded onb-stagger"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-muted)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
            <span>
              {idp.org} uses {PROVIDER_LABEL[idp.provider]} —{' '}
              <Link to={'/auth/sso' as never} style={{ color: 'var(--fg-link)' }}>
                you may want to sign in with SSO
              </Link>{' '}
              instead of resetting.
            </span>
          </div>
        )}

        <Button
          type="submit"
          leading={<Mail className="w-3.5 h-3.5" />}
          disabled={phase === 'sending'}
        >
          {phase === 'sending' ? 'Sending…' : 'Send reset link'}
        </Button>

        <PrivacyNote attempts={rate.attempts} />
      </form>
    </AuthShell>
  );
}

function SentPanel({
  email, cooldownLeft, onResend,
}: { email: string; cooldownLeft: number; onResend: () => void }) {
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
        <div className="flex flex-col gap-1 text-[11px] leading-snug">
          <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
            Email request processed
          </span>
          <span style={{ color: 'var(--fg-muted)' }}>
            Subject: <span style={{ color: 'var(--fg-default)' }}>&quot;Reset your se · field password&quot;</span>{' '}
            · From: <span className="font-mono">noreply@se-field.app</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-[11px]">
        <span style={{ color: 'var(--fg-muted)' }}>
          What to expect:
        </span>
        <ul className="flex flex-col gap-1 pl-1">
          {[
            { ok: true,  text: 'A link arrives within 1–2 minutes' },
            { ok: true,  text: 'The link is valid for 30 minutes' },
            { ok: true,  text: 'Single-use — clicking it again does nothing' },
            { ok: false, text: "Didn't arrive? Check spam, then resend." },
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
        className="self-start inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
        style={{
          background: 'transparent',
          color: cooldownLeft > 0 ? 'var(--fg-subtle)' : 'var(--fg-link)',
          border: '1px solid var(--border-default)',
          cursor: cooldownLeft > 0 ? 'default' : 'pointer',
        }}
      >
        {cooldownLeft > 0 ? <Clock className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
        {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : 'Resend email'}
      </button>

      <p className="text-[10px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
        For security, we always show this screen — even if no account exists for{' '}
        <span className="font-mono">{email}</span>.
        That way attackers can&apos;t use this form to discover registered emails.
      </p>
    </div>
  );
}

function PrivacyNote({ attempts }: { attempts: number }) {
  return (
    <div
      className="flex items-start gap-2 text-[10px] leading-snug"
      style={{ color: 'var(--fg-subtle)' }}
    >
      <Info className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        We never reveal whether an email is registered. Up to 5 reset requests per hour, per device.
        {attempts > 0 && (
          <> You&apos;ve made <span style={{ color: 'var(--fg-default)' }}>{attempts}/5</span> this hour.</>
        )}
      </span>
    </div>
  );
}
