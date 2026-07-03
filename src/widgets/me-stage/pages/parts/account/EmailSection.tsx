import { useState } from 'react';
import { Mail, Loader2, Building2 } from 'lucide-react';
import { Section, Row, Field, Button } from '@shared/ui/forms';

export function EmailSection() {
  const currentEmail = 'sora@acme.com';
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [step, setStep] = useState<'idle' | 'sending' | 'sent'>('idle');

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) && newEmail !== currentEmail;

  return (
    <Section
      title="Email address"
      hint="Used for sign-in and account-related notifications. Changing requires confirmation from both addresses."
    >
      <Row
        label={editing ? 'Current email' : 'Email address'}
        sub={
          <span>
            <span className="font-mono">{currentEmail}</span>{' '}
            <span style={{ color: 'var(--intent-success-fg)' }}>· Verified</span>
          </span>
        }
      >
        {!editing && (
          <Button onClick={() => { setEditing(true); }}>
            Change email
          </Button>
        )}
      </Row>

      {editing && (
        <div
          className="flex flex-col gap-3 px-3 py-3 rounded-md onb-stagger"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
          }}
        >
          {step === 'idle' && (
            <>
              <Field
                label="New email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); }}
                placeholder="you@company.com"
                autoFocus
              />
              <SsoWarning email={newEmail} />
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!valid}
                  onClick={() => {
                    setStep('sending');
                    setTimeout(() => { setStep('sent'); }, 800);
                  }}
                >
                  Send verification email
                </Button>
                <Button variant="ghost" size="md" onClick={() => { setEditing(false); setNewEmail(''); setStep('idle'); }}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                We&apos;ll send a confirmation link to <span className="font-mono">{newEmail || 'the new address'}</span>.
                Until you click it, you&apos;ll keep signing in with <span className="font-mono">{currentEmail}</span>.
              </p>
            </>
          )}
          {step === 'sending' && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending…
            </div>
          )}
          {step === 'sent' && (
            <div
              className="flex items-start gap-3"
              style={{ color: 'var(--fg-muted)' }}
            >
              <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
              <div className="flex flex-col gap-1.5 text-sm leading-snug">
                <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  Verification email sent to {newEmail}
                </span>
                <span>
                  Click the link in that email within 30 minutes to complete the change.
                  We&apos;ve also notified <span className="font-mono">{currentEmail}</span> so you can revoke if it wasn&apos;t you.
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Button onClick={() => { setEditing(false); setNewEmail(''); setStep('idle'); }}>Done</Button>
                  <Button variant="ghost" onClick={() => { setStep('idle'); }}>
                    Use a different email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function SsoWarning({ email }: { email: string }) {
  if (!email.includes('@')) return null;
  const domain = email.split('@')[1]?.toLowerCase();
  const ssoEnforced = domain === 'acme.com' || domain === 'globex.io' || domain === 'hooli.xyz';
  if (!ssoEnforced) return null;
  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2 rounded text-sm leading-snug onb-stagger"
      style={{
        background: 'var(--intent-warn-bg)',
        border: '1px solid var(--intent-warn-fg)',
        color: 'var(--fg-strong)',
      }}
    >
      <Building2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
      <span>
        <span className="font-mono">{domain}</span> requires SSO. After you change to this address,
        you&apos;ll sign in via the IdP and password will be disabled.
      </span>
    </div>
  );
}
