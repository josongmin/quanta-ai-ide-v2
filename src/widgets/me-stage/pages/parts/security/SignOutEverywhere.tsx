import { useState } from 'react';
import { Section, Row, Button } from '@shared/ui/forms';

// Demo-only security panel. Real session revocation is wired in
// me-stage/real/SecurityReal.tsx (revokeOtherSessions over better-auth),
// which renders instead whenever env.useRealAuth is on. In this standalone
// demo there is no session backend, so the confirm's primary action is
// honestly DISABLED with an accessible reason rather than faking a
// successful sign-out that revokes nothing.
const DEMO_REASON = 'Not available in this demo build — revoking sessions needs a signed-in backend.';

export function SignOutEverywhere() {
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Sign out everywhere" hint="Ends all active sessions across all devices except this one.">
      <Row
        label="Sign out of all other devices"
        sub="Other devices will need to sign in and complete 2FA again. Useful if you suspect a compromise."
      >
        {confirming ? (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" onClick={() => { setConfirming(false); }}>Cancel</Button>
              <Button variant="danger" disabled title={DEMO_REASON}>
                Yes, sign out everywhere
              </Button>
            </div>
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{DEMO_REASON}</span>
          </div>
        ) : (
          <Button onClick={() => { setConfirming(true); }}>
            Sign out other devices
          </Button>
        )}
      </Row>
    </Section>
  );
}
