import { useMemo, useState } from 'react';
import {
  Eye, EyeOff, AlertTriangle, Mail, Loader2, Check, Download, Trash2, Building2,
} from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Field, Button, Divider } from '@shared/ui/forms';
import { PasswordStrengthPanel, evaluatePassword } from '@widgets/auth-stage';
import { formatTime } from '@shared/i18n';

export default function AccountPage() {
  return (
    <MeShell
      title="Account"
      subtitle="Email, password, exports, and account deletion."
    >
      <EmailSection />
      <PasswordSection />
      <ExportSection />
      <DangerSection />
    </MeShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Email — supports change with verification cycle

function EmailSection() {
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
              <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                We&apos;ll send a confirmation link to <span className="font-mono">{newEmail || 'the new address'}</span>.
                Until you click it, you&apos;ll keep signing in with <span className="font-mono">{currentEmail}</span>.
              </p>
            </>
          )}
          {step === 'sending' && (
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--fg-muted)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending…
            </div>
          )}
          {step === 'sent' && (
            <div
              className="flex items-start gap-3"
              style={{ color: 'var(--fg-muted)' }}
            >
              <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--brand-fg)' }} />
              <div className="flex flex-col gap-1.5 text-[11px] leading-snug">
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
      className="flex items-start gap-2 px-2.5 py-2 rounded text-[11px] leading-snug onb-stagger"
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

// ─────────────────────────────────────────────────────────────────────────
// Password — current + new + confirm with strength meter and breach check

function PasswordSection() {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'saved' | 'wrong-current'>('idle');

  const report = useMemo(() => evaluatePassword(next), [next]);
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = report.score >= 3 && !report.breached && next === confirm && current.length > 0;

  const submit = () => {
    if (!ready) return;
    setPhase('submitting');
    setTimeout(() => {
      // Demo: only `sefield-demo` is the "correct" current password.
      if (current !== 'sefield-demo') {
        setPhase('wrong-current');
        setCurrent('');
        return;
      }
      setPhase('saved');
      setTimeout(() => {
        setEditing(false);
        setCurrent(''); setNext(''); setConfirm('');
        setPhase('idle');
      }, 1500);
    }, 700);
  };

  return (
    <Section
      title="Password"
      hint="At least 12 characters with mixed case, a number, and a symbol. We'll sign out other sessions when you change it."
    >
      <Row
        label="Password"
        sub={<span>Last changed 3 months ago. Strong · 14 characters.</span>}
      >
        {!editing && (
          <Button onClick={() => { setEditing(true); }}>
            Change password
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
          <Field
            label="Current password"
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); }}
            error={phase === 'wrong-current' ? 'That password is incorrect. Try again.' : undefined}
            placeholder="••••••••"
            autoFocus
            trailing={
              <button
                type="button"
                onClick={() => { setShowCurrent((v) => !v); }}
                className="p-1 rounded-md"
                style={{ color: 'var(--fg-muted)' }}
                aria-label={showCurrent ? 'Hide' : 'Show'}
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
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
            trailing={
              confirm.length > 0 && !mismatch && (
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--intent-success-fg)' }} />
              )
            }
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={submit}
              disabled={!ready || phase === 'submitting' || phase === 'saved'}
            >
              {phase === 'submitting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {phase === 'saved'      && <Check className="w-3.5 h-3.5" />}
              {phase === 'submitting' ? 'Updating…' : phase === 'saved' ? 'Updated' : 'Update password'}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => { setEditing(false); setCurrent(''); setNext(''); setConfirm(''); setPhase('idle'); }}
              disabled={phase === 'submitting'}
            >
              Cancel
            </Button>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            Demo: current password is <span className="font-mono">sefield-demo</span>.
            Anything else triggers the wrong-current branch.
          </p>
        </div>
      )}
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Data export — request a copy of all your data

function ExportSection() {
  const [requested, setRequested] = useState(false);
  const requestedAt = useMemo(() => new Date(), []);
  return (
    <Section
      title="Export your data"
      hint="GDPR-compatible export. Includes profile, comments, reviews, AI tokens used, and audit history."
    >
      <Row
        label="Data export"
        sub={
          requested
            ? <span>Requested at {formatTime(requestedAt, { hour: '2-digit', minute: '2-digit' })}. Average prep time is ~10 minutes; we&apos;ll email you when it&apos;s ready.</span>
            : <span>Generates a zip file (JSON + CSV) with everything we have on file for your account.</span>
        }
      >
        <Button
          leading={requested ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          onClick={() => { setRequested(true); }}
          disabled={requested}
        >
          {requested ? 'Preparing export' : 'Request export'}
        </Button>
      </Row>
    </Section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Danger zone — account deletion with type-to-confirm

function DangerSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting'>('idle');

  const required = 'delete sora@acme.com';
  const matched = confirmText.trim().toLowerCase() === required;

  return (
    <>
      <Divider />
      <div
        className="mt-6 rounded-md overflow-hidden"
        style={{ border: '1px solid var(--intent-danger-fg)' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--intent-danger-bg)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Danger zone
            </span>
          </div>
        </div>
        <div className="px-4 py-4 flex flex-col gap-2">
          <Row
            label="Delete this account"
            sub="Permanently removes your profile, comments, and tokens. You'll be removed from all organizations. This action cannot be undone."
            danger
          >
            <Button variant="danger" onClick={() => { setOpen(true); }} leading={<Trash2 className="w-3 h-3" />}>
              Delete account
            </Button>
          </Row>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
          style={{ background: 'var(--bg-scrim)' }}
        >
          <div
            className="w-full max-w-[440px] rounded-md p-5 popover-panel-in flex flex-col gap-4"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--intent-danger-fg)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--intent-danger-bg)' }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
                  Delete your account?
                </h3>
                <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
                  This permanently deletes <span className="font-mono">sora@acme.com</span>,
                  your reviews, comments, AI usage history, and personal access tokens. You&apos;ll be removed from
                  3 organizations. Your contributions remain attributed to a deleted user.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Field
                label={`Type "${required}" to confirm`}
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); }}
                placeholder={required}
                autoFocus
                error={confirmText.length > 0 && !matched ? 'Doesn\'t match exactly.' : undefined}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] font-medium" style={{ color: 'var(--fg-subtle)' }}>
                  Reason for leaving (optional)
                </span>
                <select
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); }}
                  className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-surface-muted)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--fg-strong)',
                  }}
                >
                  <option value="">No reason</option>
                  <option value="duplicate">I have another account</option>
                  <option value="not-using">I&apos;m not using it anymore</option>
                  <option value="too-expensive">Too expensive</option>
                  <option value="missing-feature">Missing a feature I need</option>
                  <option value="found-alternative">Found an alternative</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="md" onClick={() => { setOpen(false); setConfirmText(''); }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={!matched || phase === 'submitting'}
                onClick={() => {
                  setPhase('submitting');
                  setTimeout(() => {
                    setPhase('idle'); setOpen(false); setConfirmText('');
                  }, 1200);
                }}
              >
                {phase === 'submitting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {phase === 'submitting' ? 'Scheduling deletion…' : 'Permanently delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
