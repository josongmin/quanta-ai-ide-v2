import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, Building2 } from 'lucide-react';
import { Section, Row, Field, Button } from '@shared/ui/forms';

export function EmailSection() {
  const { t } = useTranslation('me');
  const currentEmail = 'sora@acme.com';
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [step, setStep] = useState<'idle' | 'sending' | 'sent'>('idle');

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail) && newEmail !== currentEmail;

  return (
    <Section
      title={t('account.email.title')}
      hint={t('account.email.hint')}
    >
      <Row
        label={editing ? t('account.email.currentLabel') : t('account.email.label')}
        sub={
          <span>
            <span className="font-mono">{currentEmail}</span>{' '}
            <span style={{ color: 'var(--intent-success-fg)' }}>{t('account.email.verified')}</span>
          </span>
        }
      >
        {!editing && (
          <Button onClick={() => { setEditing(true); }}>
            {t('account.email.change')}
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
                label={t('account.email.newEmail')}
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); }}
                placeholder={t('account.email.newEmailPlaceholder')}
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
                  {t('account.email.send')}
                </Button>
                <Button variant="ghost" size="md" onClick={() => { setEditing(false); setNewEmail(''); setStep('idle'); }}>
                  {t('common.cancel')}
                </Button>
              </div>
              <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                {t('account.email.willSendPrefix')}<span className="font-mono">{newEmail || t('account.email.newAddressFallback')}</span>{t('account.email.willSendMiddle')}<span className="font-mono">{currentEmail}</span>{t('account.email.willSendSuffix')}
              </p>
            </>
          )}
          {step === 'sending' && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('account.email.sending')}
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
                  {t('account.email.sentTitle', { email: newEmail })}
                </span>
                <span>
                  {t('account.email.sentBodyPrefix')}<span className="font-mono">{currentEmail}</span>{t('account.email.sentBodySuffix')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Button onClick={() => { setEditing(false); setNewEmail(''); setStep('idle'); }}>{t('common.done')}</Button>
                  <Button variant="ghost" onClick={() => { setStep('idle'); }}>
                    {t('account.email.useDifferent')}
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
  const { t } = useTranslation('me');
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
        <span className="font-mono">{domain}</span>{t('account.email.ssoWarningSuffix')}
      </span>
    </div>
  );
}
