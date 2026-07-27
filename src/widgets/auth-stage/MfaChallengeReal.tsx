import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Check, Loader2 } from 'lucide-react';
import { verifyTotp, verifyBackupCode } from '@entities/session';
import { AuthShell } from './parts/AuthShell';
import { AuthButton as Button } from '@shared/ui/forms';
import { TotpInput, BackupInput, TrustDevice, type Phase } from './parts/mfa';

// Real 2FA challenge during sign-in (reached when signIn reports twoFactorRedirect).
// TOTP + backup code only — passkey/security-key isn't backend-backed, so unlike
// the mock this offers just the two methods better-auth's twoFactor supports.
export default function MfaChallengeReal() {
  const navigate = useNavigate();
  const dest = useMemo(() => {
    const r = new URLSearchParams(window.location.search).get('redirect');
    return r?.startsWith('/') ? r : '/intelligence';
  }, []);

  const [method, setMethod] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [backup, setBackup] = useState('');
  const [trust, setTrust] = useState(false);
  const [phase, setPhase] = useState<Phase>('challenge');
  const [error, setError] = useState<string | null>(null);
  // In-flight latch — the phase-state snapshot isn't reliable against the
  // auto-verify re-firing while a verify is already awaiting.
  const inFlight = useRef(false);

  const fullCode = code.join('');

  const verify = () => {
    if (inFlight.current || phase === 'success') return;
    inFlight.current = true;
    setPhase('verifying');
    setError(null);
    void (async () => {
      const res = method === 'totp'
        ? await verifyTotp({ code: fullCode, trustDevice: trust })
        : await verifyBackupCode({ code: backup.trim(), trustDevice: trust });
      inFlight.current = false;
      if (res.ok) {
        setPhase('success');
        await navigate({ to: dest as never });
      } else {
        setPhase('wrong-code');
        setError(res.error);
        if (method === 'totp') setCode(['', '', '', '', '', '']);
      }
    })();
  };

  // Auto-verify TOTP once all 6 digits are entered (in an effect so the
  // in-flight ref guard is read outside render). `verify` closes over current
  // state and is intentionally not a dep.
  useEffect(() => {
    if (method === 'totp' && fullCode.length === 6 && phase === 'challenge') verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullCode, method, phase]);

  return (
    <AuthShell
      title="Two-factor verification"
      subtitle="One more step. Enter the code from your authenticator."
      footer={
        <>
          <span>Lost access to all methods?</span>
          <Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>Contact support</Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {method === 'totp' ? (
          <TotpInput
            value={code}
            onChange={(c) => { setCode(c); setPhase('challenge'); }}
            phase={phase}
          />
        ) : (
          <BackupInput
            value={backup}
            onChange={(v) => { setBackup(v); setPhase('challenge'); }}
            error={phase === 'wrong-code'}
          />
        )}

        {error && (
          <span className="text-sm" style={{ color: 'var(--intent-danger-fg)' }}>{error}</span>
        )}

        <TrustDevice checked={trust} onChange={setTrust} />

        <Button
          onClick={verify}
          disabled={
            phase === 'verifying' || phase === 'success'
            || (method === 'totp' && fullCode.length !== 6)
            || (method === 'backup' && backup.trim().length < 8)
          }
        >
          {phase === 'verifying' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {phase === 'success' && <Check className="w-3.5 h-3.5" />}
          {phase === 'verifying' ? 'Verifying…' : phase === 'success' ? 'Verified · redirecting' : 'Verify and continue'}
        </Button>

        <button
          type="button"
          className="bg-transparent border-0 p-0 cursor-pointer text-sm self-center"
          style={{ color: 'var(--fg-link)', font: 'inherit' }}
          onClick={() => { setMethod((m) => (m === 'totp' ? 'backup' : 'totp')); setPhase('challenge'); setError(null); }}
        >
          {method === 'totp' ? 'Use a backup code instead' : 'Use your authenticator app'}
        </button>
      </div>

      <div className="text-center text-sm pt-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>← Back to sign in</Link>
      </div>
    </AuthShell>
  );
}
