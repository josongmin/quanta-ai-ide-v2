import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSession } from '@entities/session';
import { stopImpersonating } from '@entities/admin';
import { useTranslation } from '@shared/i18n';

// Persistent warning banner shown while an admin is impersonating another user
// (session.impersonatedBy is set). It lives in the app shell — NOT under /admin,
// which the auth guard blocks for impersonated sessions — so the admin always
// has a way back out. "Stop impersonating" restores the original session cookie
// server-side, then hard-navigates to the app root so all session-derived state
// re-reads under the restored identity.
//
// House rules: intent warning tokens, no left-edge accent stripe.
export function ImpersonationBanner() {
  const { impersonatedBy } = useSession();
  const { t } = useTranslation('app');
  const [busy, setBusy] = useState(false);

  if (!impersonatedBy) return null;

  const onStop = () => {
    if (busy) return;
    setBusy(true);
    void (async () => {
      await stopImpersonating();
      // Restore original identity regardless of the tagged result — a stale
      // impersonation cookie is best cleared by a full reload to the root.
      window.location.href = '/';
    })();
  };

  return (
    <div
      role="status"
      className="shrink-0 flex items-center gap-3 px-4 py-2 text-sm border-b"
      style={{
        background: 'var(--intent-warn-bg)',
        color: 'var(--intent-warn-fg)',
        borderColor: 'var(--border-default)',
      }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-0">{t('impersonation.banner')}</span>
      <button
        type="button"
        onClick={onStop}
        disabled={busy}
        className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-60"
      >
        {busy ? t('impersonation.stopping') : t('impersonation.stop')}
      </button>
    </div>
  );
}
