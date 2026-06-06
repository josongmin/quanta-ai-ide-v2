import { useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Section, Row, Field, Button } from '@shared/ui/forms';
import { PasswordStrengthPanel, evaluatePassword } from '@widgets/auth-stage';

export function PasswordSection() {
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
