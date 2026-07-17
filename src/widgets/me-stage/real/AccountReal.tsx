import { useEffect, useMemo, useRef, useState } from 'react';
import { Mail, Loader2, Check, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Field, Button, Divider } from '@shared/ui/forms';
import { InlineError } from '@shared/ui';
import { PasswordStrengthPanel, evaluatePassword } from '@widgets/auth-stage';
import {
  useSession, changeEmail, changePassword, requestAccountDeletion,
} from '@entities/session';

// Real account surface over better-auth: change email (verification link),
// change password (revokes other sessions), request deletion (confirmation
// email). The mock's data-export section is dropped — no backend endpoint yet.
export function AccountReal() {
  const { user } = useSession();
  const email = user?.email ?? '';
  return (
    <MeShell title="Account" subtitle="Email, password, and account deletion.">
      <EmailSectionReal currentEmail={email} />
      <PasswordSectionReal />
      <DangerSectionReal currentEmail={email} />
    </MeShell>
  );
}

function EmailSectionReal({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) && newEmail !== currentEmail;

  async function submit() {
    if (!valid) return;
    setPhase('sending');
    setError(null);
    const res = await changeEmail({ newEmail, callbackURL: `${window.location.origin}/me/account` });
    if (!res.ok) { setPhase('idle'); setError(res.error); return; }
    setPhase('sent');
  }

  return (
    <Section
      title="Email address"
      hint="Used for sign-in. Changing requires confirmation from the new address."
    >
      <Row
        label="Email address"
        sub={<span className="font-mono">{currentEmail || '—'}</span>}
      >
        {!editing && <Button onClick={() => { setEditing(true); }}>Change email</Button>}
      </Row>

      {editing && (
        <div
          className="flex flex-col gap-3 px-3 py-3 rounded-md"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
          {phase === 'sent' ? (
            <div className="flex items-start gap-3" style={{ color: 'var(--fg-muted)' }}>
              <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
              <div className="flex flex-col gap-1.5 text-sm leading-snug">
                <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
                  Verification email sent to {newEmail}
                </span>
                <span>Click the link in that email to complete the change. Until then you keep signing in with your current address.</span>
                <div className="mt-1">
                  <Button onClick={() => { setEditing(false); setNewEmail(''); setPhase('idle'); }}>Done</Button>
                </div>
              </div>
            </div>
          ) : (
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
              <div className="flex items-center gap-2">
                <Button variant="primary" size="md" disabled={!valid || phase === 'sending'} onClick={() => { void submit(); }}>
                  {phase === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {phase === 'sending' ? 'Sending…' : 'Send verification email'}
                </Button>
                <Button variant="ghost" size="md" onClick={() => { setEditing(false); setNewEmail(''); setError(null); }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Section>
  );
}

function PasswordSectionReal() {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const report = useMemo(() => evaluatePassword(next), [next]);
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = report.score >= 3 && !report.breached && next === confirm && current.length > 0;
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  function reset() {
    setEditing(false); setCurrent(''); setNext(''); setConfirm(''); setPhase('idle'); setError(null);
  }

  async function submit() {
    if (!ready) return;
    setPhase('submitting');
    setError(null);
    // Changing the password signs out other sessions (better-auth revokes them).
    const res = await changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    if (!res.ok) { setPhase('idle'); setCurrent(''); setError(res.error); return; }
    setPhase('saved');
    resetTimer.current = setTimeout(reset, 1500);
  }

  return (
    <Section
      title="Password"
      hint="At least 12 characters with mixed case, a number, and a symbol. Other sessions are signed out on change."
    >
      <Row label="Password" sub={<span>Change your sign-in password.</span>}>
        {!editing && <Button onClick={() => { setEditing(true); }}>Change password</Button>}
      </Row>

      {editing && (
        <div
          className="flex flex-col gap-3 px-3 py-3 rounded-md"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); }}
            placeholder="••••••••"
            autoFocus
          />
          <div className="flex flex-col gap-2.5">
            <Field
              label="New password"
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={next}
              onChange={(e) => { setNext(e.target.value); }}
              placeholder="At least 12 characters"
              trailing={
                <button
                  type="button"
                  onClick={() => { setShowNext((v) => !v); }}
                  className="p-1 rounded-md"
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label={showNext ? 'Hide' : 'Show'}
                >
                  {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              }
            />
            {next.length > 0 && <PasswordStrengthPanel report={report} />}
          </div>
          <Field
            label="Confirm new password"
            type={showNext ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); }}
            error={mismatch ? 'Passwords do not match' : undefined}
            trailing={confirm.length > 0 && !mismatch
              ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
              : undefined}
          />
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="md" onClick={() => { void submit(); }} disabled={!ready || phase !== 'idle'}>
              {phase === 'submitting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {phase === 'saved' && <Check className="w-3.5 h-3.5" />}
              {phase === 'submitting' ? 'Updating…' : phase === 'saved' ? 'Updated' : 'Update password'}
            </Button>
            <Button variant="ghost" size="md" onClick={reset} disabled={phase === 'submitting'}>Cancel</Button>
          </div>
        </div>
      )}
    </Section>
  );
}

function DangerSectionReal({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const required = `delete ${currentEmail}`;
  const matched = confirmText.trim().toLowerCase() === required.toLowerCase();

  async function submit() {
    if (!matched) return;
    setPhase('submitting');
    setError(null);
    const res = await requestAccountDeletion({ callbackURL: `${window.location.origin}/` });
    if (!res.ok) { setPhase('idle'); setError(res.error); return; }
    setPhase('sent');
  }

  return (
    <>
      <Divider />
      <div className="mt-6 rounded-md overflow-hidden" style={{ border: '1px solid var(--intent-danger-fg)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'var(--intent-danger-bg)' }}>
          <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>Danger zone</span>
        </div>
        <div className="px-4 py-4 flex flex-col gap-3">
          <Row
            label="Delete this account"
            sub="Permanently removes your profile and tokens, and removes you from all organizations. This cannot be undone."
            danger
          >
            {!open && (
              <Button variant="danger" onClick={() => { setOpen(true); }} leading={<Trash2 className="w-3 h-3" />}>
                Delete account
              </Button>
            )}
          </Row>

          {open && (
            <div
              className="flex flex-col gap-3 px-3 py-3 rounded-md"
              style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
            >
              {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
              {phase === 'sent' ? (
                <div className="flex items-start gap-3 text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
                  <span>
                    We&apos;ve emailed <span className="font-mono">{currentEmail}</span> a confirmation link.
                    Your account is deleted once you confirm from that email.
                  </span>
                </div>
              ) : (
                <>
                  <Field
                    label={`Type "${required}" to confirm`}
                    value={confirmText}
                    onChange={(e) => { setConfirmText(e.target.value); }}
                    placeholder={required}
                    autoFocus
                    error={confirmText.length > 0 && !matched ? "Doesn't match exactly." : undefined}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="danger" size="md" disabled={!matched || phase === 'submitting'} onClick={() => { void submit(); }}>
                      {phase === 'submitting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      {phase === 'submitting' ? 'Sending…' : 'Email me a deletion link'}
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => { setOpen(false); setConfirmText(''); setError(null); }}>Cancel</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
