import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Check } from 'lucide-react';
import { Section, Row, Field, Button } from '@shared/ui/forms';
import { PasswordStrengthPanel, evaluatePassword } from '@features/password-strength';

export function PasswordSection() {
  const { t } = useTranslation('me');
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'saved' | 'wrong-current'>('idle');

  const report = useMemo(() => evaluatePassword(next), [next]);
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = report.meetsPolicy && next === confirm && current.length > 0;

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
      title={t('account.password.title')}
      hint={t('account.password.hint')}
    >
      <Row
        label={t('account.password.title')}
        sub={<span>{t('account.password.meta')}</span>}
      >
        {!editing && (
          <Button onClick={() => { setEditing(true); }}>
            {t('account.password.change')}
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
            label={t('account.password.current')}
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); }}
            error={phase === 'wrong-current' ? t('account.password.wrongCurrent') : undefined}
            placeholder="••••••••"
            autoFocus
            trailing={
              <button
                type="button"
                onClick={() => { setShowCurrent((v) => !v); }}
                className="p-1 rounded-md"
                style={{ color: 'var(--fg-muted)' }}
                aria-label={showCurrent ? t('account.password.hide') : t('account.password.show')}
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            }
          />
          <div className="flex flex-col gap-2.5">
            <Field
              label={t('account.password.new')}
              type={showNext ? 'text' : 'password'}
              autoComplete="new-password"
              value={next}
              onChange={(e) => { setNext(e.target.value); }}
              placeholder={t('account.password.newPlaceholder')}
              trailing={
                <button
                  type="button"
                  onClick={() => { setShowNext((v) => !v); }}
                  className="p-1 rounded-md"
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label={showNext ? t('account.password.hide') : t('account.password.show')}
                >
                  {showNext ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              }
            />
            {next.length > 0 && <PasswordStrengthPanel report={report} />}
          </div>
          <Field
            label={t('account.password.confirm')}
            type={showNext ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); }}
            error={mismatch ? t('account.password.mismatch') : undefined}
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
              {phase === 'submitting' ? t('account.password.updating') : phase === 'saved' ? t('account.password.updated') : t('account.password.update')}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => { setEditing(false); setCurrent(''); setNext(''); setConfirm(''); setPhase('idle'); }}
              disabled={phase === 'submitting'}
            >
              {t('common.cancel')}
            </Button>
          </div>
          <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            {t('account.password.demoHintPrefix')}<span className="font-mono">sefield-demo</span>{t('account.password.demoHintSuffix')}
          </p>
        </div>
      )}
    </Section>
  );
}
