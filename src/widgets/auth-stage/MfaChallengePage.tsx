import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Loader2 } from 'lucide-react';
import { env } from '@shared/config/env';
import { AuthShell } from './parts/AuthShell';
import { AuthButton as Button } from '@shared/ui/forms';
import {
  MethodTabs, TotpInput, WebAuthnPrompt, BackupInput,
  TrustDevice, LowBackupBanner, FallbackHint, BackupCodesGenerated,
  DEMO_TOTP,
} from './parts/mfa';
import type { Method, Phase } from './parts/mfa';
import MfaChallengeReal from './MfaChallengeReal';

// Real auth → live TOTP/backup verify against accounts; otherwise the demo mock
// (which also offers a fake passkey path).
export default function MfaChallengePage() {
  return env.useRealAuth ? <MfaChallengeReal /> : <MfaChallengeMock />;
}

function MfaChallengeMock() {
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
          <Link to={'/support' as never} style={{ color: 'var(--fg-link)' }}>Contact your admin</Link>
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
            demo
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

      <div className="text-center text-sm pt-3" style={{ borderTop: '1px solid var(--border-muted)' }}>
        <Link to={'/auth/login' as never} style={{ color: 'var(--fg-link)' }}>
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
