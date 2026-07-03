import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Mail, Check, AlertCircle, Loader2, ShieldAlert, Clock, RotateCw,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';
import { Button } from './parts/AuthForm';
import { formatTime, formatDate } from '@shared/i18n';

type Phase = 'verifying' | 'success' | 'expired' | 'reused' | 'wasnt-me';

export default function VerifyEmailPage() {
  const [phase, setPhase] = useState<Phase>('verifying');
  // 24-hour token, started when this page mounts. In real life, the issuance
  // timestamp comes from the token itself (JWT exp claim).
  const [issuedAt] = useState(() => Date.now());
  const expiresAt = useMemo(() => issuedAt + 24 * 60 * 60 * 1000, [issuedAt]);
  const [now, setNow] = useState(() => Date.now());

  // Resend cooldown: 60s after each click.
  const [lastResend, setLastResend] = useState<number | null>(null);
  const cooldownLeft = lastResend ? Math.max(0, Math.ceil((lastResend + 60_000 - now) / 1000)) : 0;

  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); }, 1000);
    return () => { clearInterval(id); };
  }, []);

  // Auto-verify on mount (1.4s).
  useEffect(() => {
    if (phase !== 'verifying') return;
    const id = setTimeout(() => { setPhase('success'); }, 1400);
    return () => { clearTimeout(id); };
  }, [phase]);

  const remainingSec = Math.max(0, Math.floor((expiresAt - now) / 1000));

  return (
    <AuthShell
      title={titleFor(phase)}
      subtitle={subtitleFor(phase)}
      topRight={
        <DemoStateToggle phase={phase} onChange={setPhase} />
      }
      footer={
        phase === 'wasnt-me'
          ? <span>We&apos;ve revoked the token. <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Contact support</button> if you need help.</span>
          : <><span>Need help?</span><button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Contact support</button></>
      }
    >
      <div className="flex flex-col items-center gap-5 py-2">
        <StateGlyph phase={phase} />

        {phase === 'verifying' && <TokenChip />}

        {phase === 'success' && <SuccessActions />}

        {(phase === 'expired' || phase === 'reused') && (
          <div className="w-full flex flex-col gap-3">
            <ExpiryRow expiresAt={expiresAt} remainingSec={remainingSec} />
            <Button
              leading={cooldownLeft > 0 ? <Clock className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
              onClick={() => {
                if (cooldownLeft > 0) return;
                setLastResend(Date.now());
                setPhase('verifying');
              }}
              disabled={cooldownLeft > 0}
            >
              {cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : 'Resend verification link'}
            </Button>
            <button
              type="button"
              onClick={() => { setPhase('wasnt-me'); }}
              className="text-sm underline-offset-2 hover:underline self-center"
              style={{ color: 'var(--fg-muted)' }}
            >
              I didn&apos;t request this verification
            </button>
          </div>
        )}

        {phase === 'wasnt-me' && <WasntMePanel />}
      </div>
    </AuthShell>
  );
}

function titleFor(p: Phase) {
  switch (p) {
    case 'verifying': return 'Verifying your email…';
    case 'success':   return 'Email verified';
    case 'expired':   return 'This link expired';
    case 'reused':    return 'This link was already used';
    case 'wasnt-me':  return 'Token revoked';
  }
}
function subtitleFor(p: Phase) {
  switch (p) {
    case 'verifying': return 'This usually takes a couple of seconds.';
    case 'success':   return 'You can now access your workspace and invite teammates.';
    case 'expired':   return 'Verification links are valid for 24 hours. Request a fresh one to continue.';
    case 'reused':    return 'This link has been used to verify another session. Each link only works once.';
    case 'wasnt-me':  return 'Thanks for letting us know. We have invalidated the verification request.';
  }
}

function StateGlyph({ phase }: { phase: Phase }) {
  if (phase === 'verifying') {
    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </div>
    );
  }
  if (phase === 'success') {
    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'var(--intent-success-bg)' }}
      >
        <Check className="w-5 h-5" style={{ color: 'var(--intent-success-fg)' }} />
      </div>
    );
  }
  if (phase === 'wasnt-me') {
    return (
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'var(--intent-danger-bg)' }}
      >
        <ShieldAlert className="w-5 h-5" style={{ color: 'var(--intent-danger-fg)' }} />
      </div>
    );
  }
  // expired / reused
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: 'var(--intent-warn-bg)' }}
    >
      <AlertCircle className="w-5 h-5" style={{ color: 'var(--intent-warn-fg)' }} />
    </div>
  );
}

function TokenChip() {
  return (
    <div
      className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-md font-mono tabular-nums"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
      }}
    >
      <span style={{ color: 'var(--fg-subtle)' }}>token</span>
      <span style={{ color: 'var(--fg-default)' }}>eyJhbGc…</span>
      <span style={{ color: 'var(--fg-subtle)' }}>·</span>
      <span style={{ color: 'var(--fg-default)' }}>HS256</span>
    </div>
  );
}

function SuccessActions() {
  return (
    <div className="w-full flex flex-col gap-3">
      <Link
        to={'/onboarding' as never}
        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-base font-semibold w-full"
        style={{ background: 'var(--fg-strong)', color: 'var(--bg-canvas)' }}
      >
        Continue setup →
      </Link>
      <div
        className="grid grid-cols-2 gap-3 text-sm px-3 py-2.5 rounded-md"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-muted)',
        }}
      >
        <Meta label="Email"   value="sora@acme.com" />
        <Meta label="Verified at" value={formatTime(new Date(), { hour: '2-digit', minute: '2-digit' })} />
        <Meta label="IP"      value="203.0.113.42" mono />
        <Meta label="Browser" value="Chrome 125 · macOS" />
      </div>
    </div>
  );
}

function ExpiryRow({ expiresAt, remainingSec }: { expiresAt: number; remainingSec: number }) {
  const totalSec = 24 * 60 * 60;
  const pct = (remainingSec / totalSec) * 100;
  return (
    <div
      className="flex flex-col gap-2 px-3 py-2.5 rounded-md w-full"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-baseline justify-between text-sm">
        <span style={{ color: 'var(--fg-muted)' }}>Token validity</span>
        <span className="font-mono tabular-nums" style={{ color: 'var(--fg-default)' }}>
          expires <span title={new Date(expiresAt).toISOString()}>
            {formatRelative(remainingSec)}
          </span>
        </span>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--border-muted)' }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: pct < 10 ? 'var(--intent-danger-fg)' : pct < 30 ? 'var(--intent-warn-fg)' : 'var(--fg-accent)',
            transition: 'width 600ms linear, background 220ms ease',
          }}
        />
      </div>
    </div>
  );
}

function formatRelative(sec: number) {
  if (sec <= 0) return 'now';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h >= 1) return `in ${h}h ${m}m`;
  if (m >= 1) return `in ${m}m`;
  return `in ${sec}s`;
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-2xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {label}
      </dt>
      <dd className={mono ? 'font-mono tabular-nums' : ''} style={{ color: 'var(--fg-default)' }}>
        {value}
      </dd>
    </div>
  );
}

function WasntMePanel() {
  return (
    <div className="w-full flex flex-col gap-3">
      <div
        className="px-3 py-3 rounded-md text-sm leading-snug"
        style={{
          background: 'var(--intent-danger-bg)',
          border: '1px solid var(--intent-danger-fg)',
        }}
      >
        <span className="font-semibold block mb-1" style={{ color: 'var(--fg-strong)' }}>
          Token has been revoked.
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          We logged this incident at <span className="font-mono">{formatDate(new Date(), { dateStyle: 'medium', timeStyle: 'short' })}</span>.
          If your password may have been compromised, change it now.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to={'/auth/forgot' as never}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium"
          style={{
            background: 'var(--fg-strong)',
            color: 'var(--bg-canvas)',
          }}
        >
          Change password
        </Link>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium"
          style={{
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-default)',
            border: '1px solid var(--border-default)',
          }}
        >
          Contact security team
        </button>
      </div>
    </div>
  );
}

function DemoStateToggle({
  phase, onChange,
}: { phase: Phase; onChange: (p: Phase) => void }) {
  const states: { id: Phase; label: string }[] = [
    { id: 'verifying', label: 'Verifying' },
    { id: 'success',   label: 'Success' },
    { id: 'expired',   label: 'Expired' },
    { id: 'reused',    label: 'Reused' },
    { id: 'wasnt-me',  label: "Wasn't me" },
  ];
  return (
    <div className="inline-flex items-center gap-1 text-xs">
      <RotateCw className="w-2.5 h-2.5" style={{ color: 'var(--fg-subtle)' }} />
      <span style={{ color: 'var(--fg-subtle)' }}>Demo:</span>
      {states.map((s, i) => (
        <span key={s.id}>
          <button
            type="button"
            onClick={() => { onChange(s.id); }}
            className="font-mono"
            style={{
              color: phase === s.id ? 'var(--fg-strong)' : 'var(--fg-link)',
              fontWeight: phase === s.id ? 700 : 400,
            }}
          >
            {s.label}
          </button>
          {i < states.length - 1 && <span style={{ color: 'var(--border-default)' }}>·</span>}
        </span>
      ))}
    </div>
  );
}
