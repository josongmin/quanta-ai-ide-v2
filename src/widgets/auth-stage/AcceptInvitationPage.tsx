import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Check, AlertCircle, Loader2, UserPlus } from 'lucide-react';
import { env } from '@shared/config/env';
import { acceptInvitation } from '@entities/org';
import { AuthShell } from './parts/AuthShell';
import { AuthButton as Button } from '@shared/ui/forms';

type Phase = 'accepting' | 'success' | 'error';

// Landing page for the emailed accept-invitation link (/accept-invitation/$id).
// Requires a session — the root auth guard bounces an unauthenticated visitor to
// login (remembering this URL) and back. Accepts via better-auth, which adds the
// user to the org and bumps its entitlement epoch.
export default function AcceptInvitationPage() {
  const { t } = useTranslation('auth');
  // Invitation id from the path (/accept-invitation/<id>). Read once, like the
  // verify-email page reads its ?token.
  const id = useMemo(() => {
    const m = /\/accept-invitation\/([^/?#]+)/.exec(window.location.pathname);
    return m?.[1] ? decodeURIComponent(m[1]) : '';
  }, []);
  const [phase, setPhase] = useState<Phase>(id || !env.useRealAuth ? 'accepting' : 'error');
  const [error, setError] = useState<string | null>(
    id || !env.useRealAuth ? null : t('acceptInvitation.missingToken'),
  );

  useEffect(() => {
    if (!env.useRealAuth) {
      // Standalone demo: no backend — show the success state after a beat.
      const t = setTimeout(() => { setPhase('success'); }, 900);
      return () => { clearTimeout(t); };
    }
    if (!id) return; // handled at init (phase='error')
    let active = true;
    void acceptInvitation({ invitationId: id }).then((res) => {
      if (!active) return;
      if (res.ok) setPhase('success');
      else { setPhase('error'); setError(res.error); }
    });
    return () => { active = false; };
  }, [id]);

  return (
    <AuthShell title={t('acceptInvitation.title')} subtitle={t('acceptInvitation.subtitle')}>
      {phase === 'accepting' && (
        <div className="flex items-center gap-2 text-base" style={{ color: 'var(--fg-muted)' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('acceptInvitation.accepting')}
        </div>
      )}

      {phase === 'success' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--intent-success-bg)' }}
            >
              <Check className="w-4 h-4" style={{ color: 'var(--intent-success-fg)' }} />
            </div>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-default)' }}>
              {t('acceptInvitation.success')}
            </p>
          </div>
          <Link to="/intelligence" className="contents">
            <Button leading={<UserPlus className="w-3.5 h-3.5" />}>{t('acceptInvitation.goToWorkspace')}</Button>
          </Link>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--intent-danger-bg)' }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            </div>
            <p className="text-base leading-snug" style={{ color: 'var(--fg-default)' }}>
              {error ?? t('acceptInvitation.errorFallback')}{t('acceptInvitation.errorSuffix')}
            </p>
          </div>
          <Link to="/intelligence" className="contents">
            <Button>{t('acceptInvitation.continueToApp')}</Button>
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
