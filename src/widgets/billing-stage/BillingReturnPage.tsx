import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Check, XCircle, Loader2 } from 'lucide-react';
import { useActiveOrgSlug } from '@entities/org';

// Landing pages for the Stripe checkout return (success_url / cancel_url, set by
// the accounts backend to the FE origin). Confirms the outcome and routes the
// user to their org's billing page (where the refreshed status shows).
function BillingReturn({ kind }: { kind: 'success' | 'cancel' }) {
  const { t } = useTranslation('billing');
  const navigate = useNavigate();
  const slug = useActiveOrgSlug();
  const [waited, setWaited] = useState(false);
  const navigated = useRef(false);

  // Give the slug hooks a beat to resolve, then route to billing (or the app).
  useEffect(() => {
    const timerId = setTimeout(() => { setWaited(true); }, 600);
    return () => { clearTimeout(timerId); };
  }, []);

  // Navigate exactly once: as soon as the slug resolves, or when the 600ms
  // fallback fires (slug still null → the app). The latch prevents a second
  // navigate if the slug arrives just after the fallback already ran.
  useEffect(() => {
    if (navigated.current) return;
    if (slug) {
      navigated.current = true;
      void navigate({ to: '/org/$org/billing', params: { org: slug } });
    } else if (waited) {
      navigated.current = true;
      void navigate({ to: '/intelligence' });
    }
  }, [waited, slug, navigate]);

  const ok = kind === 'success';
  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-6"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="flex flex-col items-center gap-3 text-center max-w-[360px]">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: ok ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)' }}
        >
          {ok
            ? <Check className="w-5 h-5" style={{ color: 'var(--intent-success-fg)' }} />
            : <XCircle className="w-5 h-5" style={{ color: 'var(--fg-muted)' }} />}
        </div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          {ok ? t('return.successTitle') : t('return.cancelTitle')}
        </h1>
        <p className="text-base leading-snug" style={{ color: 'var(--fg-muted)' }}>
          {ok ? t('return.successBody') : t('return.cancelBody')}
        </p>
        <Loader2 className="w-4 h-4 animate-spin mt-1" style={{ color: 'var(--fg-subtle)' }} />
      </div>
    </div>
  );
}

export function BillingSuccessPage() { return <BillingReturn kind="success" />; }
export function BillingCancelPage() { return <BillingReturn kind="cancel" />; }
