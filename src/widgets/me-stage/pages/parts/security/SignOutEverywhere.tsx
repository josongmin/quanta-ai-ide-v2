import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Section, Row, Button } from '@shared/ui/forms';

// Demo-only security panel. Real session revocation is wired in
// me-stage/real/SecurityReal.tsx (revokeOtherSessions over better-auth),
// which renders instead whenever env.useRealAuth is on. In this standalone
// demo there is no session backend, so the confirm's primary action is
// honestly DISABLED with an accessible reason rather than faking a
// successful sign-out that revokes nothing.

export function SignOutEverywhere() {
  const { t } = useTranslation('me');
  const demoReason = t('security.signOut.reason');
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title={t('security.signOut.title')} hint={t('security.signOut.hint')}>
      <Row
        label={t('security.signOut.label')}
        sub={t('security.signOut.sub')}
      >
        {confirming ? (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" onClick={() => { setConfirming(false); }}>{t('common.cancel')}</Button>
              <Button variant="danger" disabled title={demoReason}>
                {t('security.signOut.confirm')}
              </Button>
            </div>
            <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>{demoReason}</span>
          </div>
        ) : (
          <Button onClick={() => { setConfirming(true); }}>
            {t('security.signOut.trigger')}
          </Button>
        )}
      </Row>
    </Section>
  );
}
