import { useState } from 'react';
import { Section, Row, Button } from '@shared/ui/forms';

export function SignOutEverywhere() {
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Sign out everywhere" hint="Ends all active sessions across all devices except this one.">
      <Row
        label="Sign out of all other devices"
        sub="Other devices will need to sign in and complete 2FA again. Useful if you suspect a compromise."
      >
        {confirming ? (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" onClick={() => { setConfirming(false); }}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirming(false); }}>
              Yes, sign out everywhere
            </Button>
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
