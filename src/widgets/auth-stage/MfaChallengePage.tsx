import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Smartphone, KeyRound, ShieldCheck, Fingerprint, Download, Copy,
  Check, AlertTriangle, RefreshCw, Loader2,
} from 'lucide-react';
import { AuthShell } from './parts/AuthShell';
import { Button } from './parts/AuthForm';

type Method = 'totp' | 'webauthn' | 'backup';
type Phase  = 'challenge' | 'verifying' | 'success' | 'wrong-code' | 'low-backup';

// Demo TOTP code so reviewers can see success/failure deterministically.
// Real apps verify against the user's secret; this demo accepts only this
// exact 6-digit value.
const DEMO_TOTP = '482917';

export default function MfaChallengePage() {
  const [method, setMethod] = useState<Method>('totp');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [backupCode, setBackupCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [phase, setPhase] = useState<Phase>('challenge');
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const fullCode = code.join('');

  const verify = () => {
    setPhase('verifying');
    setTimeout(() => {
      if (method === 'totp') {
        if (fullCode === DEMO_TOTP) setPhase('success');
        else { setPhase('wrong-code'); setCode(['', '', '', '', '', '']); }
      } else if (method === 'backup') {
        if (/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i.test(backupCode)) {
          setPhase('low-backup');
        } else {
          setPhase('wrong-code');
        }
      } else {
        setPhase('success');
      }
    }, 700);
  };

  // Auto-verify TOTP once all 6 digits filled (most authenticator UX does this).
  const [prevFullCode, setPrevFullCode] = useState(fullCode);
  if (fullCode !== prevFullCode) {
    setPrevFullCode(fullCode);
    if (method === 'totp' && fullCode.length === 6 && phase === 'challenge') {
      verify();
    }
  }

  if (showBackupCodes) {
    return <BackupCodesGenerated onClose={() => { setShowBackupCodes(false); }} />;
  }

  return (
    <AuthShell
      title="Two-factor verification"
      subtitle="One more step. We need to confirm it's really you."
      topRight={<span>Signed in as <span style={{ color: 'var(--fg-default)' }}>sora@acme.com</span></span>}
      footer={
        <>
          <span>Lost access to all methods?</span>
          <button type="button" className="bg-transparent border-0 p-0 cursor-pointer" style={{ color: 'var(--fg-link)', font: 'inherit' }}>Contact your admin</button>
        </>
      }
    >
      {phase === 'low-backup' && <LowBackupBanner onRegenerate={() => { setShowBackupCodes(true); }} />}

      <MethodTabs current={method} onChange={(m) => { setMethod(m); setPhase('challenge'); }} />

      <div className="flex flex-col gap-4 onb-step-in" key={method}>
        {method === 'totp' && (
          <TotpInput
            value={code}
            onChange={(c) => { setCode(c); setPhase('challenge'); }}
            phase={phase}
          />
        )}

        {method === 'webauthn' && <WebAuthnPrompt phase={phase} onActivate={() => { verify(); }} />}

        {method === 'backup' && (
          <BackupInput
            value={backupCode}
            onChange={(v) => { setBackupCode(v); setPhase('challenge'); }}
            error={phase === 'wrong-code'}
          />
        )}

        <TrustDevice checked={trust} onChange={setTrust} />

        {method !== 'webauthn' && (
          <Button
            onClick={verify}
            disabled={
              phase === 'verifying'
              || phase === 'success'
              || (method === 'totp' && fullCode.length !== 6)
              || (method === 'backup' && backupCode.length < 14)
            }
          >
            {phase === 'verifying' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {phase === 'success'   && <Check className="w-3.5 h-3.5" />}
            {phase === 'verifying' ? 'Verifying…'
              : phase === 'success' ? 'Verified · redirecting'
              : 'Verify and continue'}
          </Button>
        )}

        <FallbackHint method={method} onSwitch={setMethod} />
      </div>

      <div className="text-center text-[11px] pt-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Method tabs

function MethodTabs({
  current, onChange,
}: { current: Method; onChange: (m: Method) => void }) {
  const tabs: { id: Method; label: string; icon: React.ReactNode; sub: string }[] = [
    { id: 'totp',     label: 'Authenticator', icon: <Smartphone className="w-3.5 h-3.5" />, sub: '6-digit code' },
    { id: 'webauthn', label: 'Security key',  icon: <ShieldCheck className="w-3.5 h-3.5" />, sub: 'Touch ID, key' },
    { id: 'backup',   label: 'Backup code',   icon: <KeyRound className="w-3.5 h-3.5" />, sub: 'One-time only' },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md"
      style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}
    >
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => { onChange(t.id); }}
            className="flex flex-col items-center justify-center gap-0.5 h-12 rounded transition-colors"
            style={{
              background: active ? 'var(--bg-canvas)' : 'transparent',
              color: active ? 'var(--fg-strong)' : 'var(--fg-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              {t.icon}
              {t.label}
            </span>
            <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TOTP — 6 single-digit boxes with paste, autofocus, error shake.

function TotpInput({
  value, onChange, phase,
}: { value: string[]; onChange: (v: string[]) => void; phase: Phase }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i: number, ch: string) => {
    const digits = ch.replace(/\D/g, '');
    if (!digits) {
      const next = [...value]; next[i] = ''; onChange(next); return;
    }
    // Paste support: if user pastes "482917" into any box, fill from there.
    if (digits.length > 1) {
      const next = [...value];
      const start = i;
      for (let j = 0; j < digits.length && start + j < 6; j++) {
        next[start + j] = digits[j]!;
      }
      onChange(next);
      const lastFilled = Math.min(5, start + digits.length - 1);
      refs.current[Math.min(5, lastFilled + 1)]?.focus();
      return;
    }
    const next = [...value]; next[i] = digits.slice(-1); onChange(next);
    if (next[i] && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0)  refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const wrong = phase === 'wrong-code';
  const success = phase === 'success';

  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Enter the 6-digit code from your app
      </span>
      <div
        className="flex gap-2"
        style={{
          animation: wrong ? 'onb-stagger 240ms reverse, totpShake 360ms' : undefined,
        }}
      >
        {value.map((v, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={i === 0 ? 6 : 1}  // first box accepts paste
            value={v}
            onChange={(e) => { setAt(i, e.target.value); }}
            onKeyDown={(e) => { onKey(i, e); }}
            disabled={success}
            className="w-11 h-12 text-center text-[18px] font-semibold tabular-nums rounded-md outline-none transition-colors"
            style={{
              background: success ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              border: `1px solid ${
                wrong ? 'var(--intent-danger-fg)'
                : success ? 'var(--intent-success-fg)'
                : v ? 'var(--fg-default)' : 'var(--border-default)'
              }`,
              color: success ? 'var(--intent-success-fg)' : 'var(--fg-strong)',
            }}
          />
        ))}
      </div>
      <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        Demo: code is <span className="font-mono" style={{ color: 'var(--fg-default)' }}>{DEMO_TOTP}</span>.
        Try anything else to see the wrong-code state.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// WebAuthn — animated fingerprint pulse + state machine.

function WebAuthnPrompt({ phase, onActivate }: { phase: Phase; onActivate: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-4 px-3 py-6 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--brand-bg)',
          border: '1.5px solid var(--brand-vivid)',
        }}
      >
        <Fingerprint className="w-7 h-7" style={{ color: 'var(--brand-fg)' }} />
        {phase === 'challenge' && (
          <span
            className="absolute inset-0 rounded-full onb-pulse-ring"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {phase === 'challenge'  && 'Touch your security key or authenticator'}
          {phase === 'verifying'  && 'Verifying signature…'}
          {phase === 'success'    && 'Authenticator confirmed'}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
          Compatible: Touch ID · Windows Hello · YubiKey · Apple Passkey
        </span>
      </div>
      {phase === 'challenge' && (
        <Button onClick={onActivate} variant="secondary" full={false}>
          <Fingerprint className="w-3.5 h-3.5" />
          Use authenticator
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Backup code — formatted xxxx-xxxx-xxxx with auto dashes.

function BackupInput({
  value, onChange, error,
}: { value: string; onChange: (v: string) => void; error: boolean }) {
  // Strip non-alphanum, lowercase, slice to 12, then re-insert dashes.
  const handle = (raw: string) => {
    const clean = raw.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 12);
    const out =
      clean.length <= 4 ? clean
      : clean.length <= 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}`
      : `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
    onChange(out);
  };

  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[10px] uppercase tracking-[0.14em] font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Backup code
      </span>
      <input
        type="text"
        autoComplete="one-time-code"
        autoFocus
        placeholder="xxxx-xxxx-xxxx"
        value={value}
        onChange={(e) => { handle(e.target.value); }}
        className="h-10 px-3 rounded-md text-[15px] font-mono tabular-nums tracking-wider outline-none transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${error ? 'var(--intent-danger-fg)' : 'var(--border-default)'}`,
          color: 'var(--fg-strong)',
        }}
      />
      <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
        Each backup code can only be used once. Find them in your authenticator settings.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Trust this device + low-backup banner + fallback hint

function TrustDevice({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <span
        className="relative w-4 h-4 rounded shrink-0 mt-0.5 transition-colors"
        style={{
          background: checked ? 'var(--brand-vivid)' : 'transparent',
          border: `1.5px solid ${checked ? 'var(--brand-vivid)' : 'var(--border-strong)'}`,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => { onChange(e.target.checked); }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {checked && (
          <Check className="w-full h-full p-0.5" style={{ color: 'var(--bg-canvas)' }} />
        )}
      </span>
      <span className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
        Trust this device for 30 days.{' '}
        <span style={{ color: 'var(--fg-subtle)' }}>
          We&apos;ll skip 2FA on this browser. Don&apos;t enable on shared computers.
        </span>
      </span>
    </label>
  );
}

function LowBackupBanner({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-3 rounded-md onb-stagger"
      style={{
        background: 'var(--intent-warn-bg)',
        border: '1px solid var(--intent-warn-fg)',
      }}
      role="status"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
      <div className="flex flex-col gap-1.5 flex-1 text-[11px]">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          Code accepted — 2 backup codes remaining
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          You&apos;re running low. Generate a fresh set now and store them somewhere safe.
        </span>
        <button
          type="button"
          onClick={onRegenerate}
          className="self-start inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded"
          style={{
            background: 'var(--bg-canvas)',
            color: 'var(--fg-strong)',
            border: '1px solid var(--border-default)',
          }}
        >
          <RefreshCw className="w-3 h-3" />
          Generate new backup codes
        </button>
      </div>
    </div>
  );
}

function FallbackHint({ method, onSwitch }: { method: Method; onSwitch: (m: Method) => void }) {
  const others: { id: Method; label: string }[] =
    method === 'totp'     ? [{ id: 'webauthn', label: 'security key' }, { id: 'backup', label: 'backup code' }]
    : method === 'webauthn' ? [{ id: 'totp', label: 'authenticator app' }, { id: 'backup', label: 'backup code' }]
    : [{ id: 'totp', label: 'authenticator app' }, { id: 'webauthn', label: 'security key' }];

  return (
    <div className="text-[11px] flex items-center gap-1 flex-wrap" style={{ color: 'var(--fg-subtle)' }}>
      <span>Don&apos;t have your{' '}
        {method === 'totp' ? 'phone' : method === 'webauthn' ? 'security key' : 'backup codes'}?
      </span>
      {others.map((o, i) => (
        <span key={o.id}>
          <button
            type="button"
            onClick={() => { onSwitch(o.id); }}
            style={{ color: 'var(--fg-link)' }}
          >
            Use {o.label}
          </button>
          {i < others.length - 1 && <span style={{ color: 'var(--border-default)' }}> · </span>}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Backup code generation overlay

function BackupCodesGenerated({ onClose }: { onClose: () => void }) {
  const codes = useMemo(() => generateCodes(10), []);
  const text = codes.join('\n');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1600);
    } catch { /* ignore */ }
  };

  const download = () => {
    const blob = new Blob([`# se · field backup codes\n# Generated ${new Date().toISOString()}\n# Each code can be used once.\n\n${text}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sefield-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthShell
      title="Save your backup codes"
      subtitle="If you lose access to your authenticator, these are the only way back in. Each code works once."
      footer={
        <span style={{ color: 'var(--intent-warn-fg)' }}>
          We won&apos;t show these again. Save them now.
        </span>
      }
    >
      <div
        className="p-4 rounded-md font-mono text-[12px] tabular-nums grid grid-cols-2 gap-x-6 gap-y-1.5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {codes.map((c, i) => (
          <div key={c} className="flex items-center gap-2">
            <span className="text-[9px] tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{c}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => { void copy(); }} leading={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
          {copied ? 'Copied' : 'Copy all'}
        </Button>
        <Button variant="secondary" onClick={download} leading={<Download className="w-3.5 h-3.5" />}>
          Download .txt
        </Button>
      </div>

      <Button onClick={onClose}>
        I&apos;ve saved them — continue
      </Button>
    </AuthShell>
  );
}

function generateCodes(n: number): string[] {
  // Demo-only deterministic-ish generator. Real systems would use cryptorandom.
  const out: string[] = [];
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';  // no 0/O/1/l/i confusables
  for (let i = 0; i < n; i++) {
    let s = '';
    for (let j = 0; j < 12; j++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
    out.push(`${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`);
  }
  return out;
}
