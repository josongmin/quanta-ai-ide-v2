import { useState } from 'react';
import { useAsyncResource } from '@shared/lib';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import type { ComponentType } from 'react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';
import { EmptyState, InlineError, SkeletonText, ConfirmDialog } from '@shared/ui';
import { listLinkedAccounts, unlinkAccount, type LinkedAccount } from '@entities/session';

// Real-mode Connected Apps: identity sign-in providers backed by the better-auth
// `account` table (list/unlink). The mock's third-party integrations (Slack/Jira/…)
// and the "available integrations" catalog have no backend and are omitted. Fields the
// endpoint doesn't return (last-used, token-expiry warnings, human scope labels) are
// honestly dropped rather than fabricated.
const PROVIDER_META: Record<string, { name: string; Icon: ComponentType<{ className?: string }> }> = {
  github: { name: 'GitHub', Icon: GithubIcon },
  google: { name: 'Google', Icon: Mail },
};

const EMPTY: LinkedAccount[] = [];

export function ConnectedAppsReal() {
  const { t } = useTranslation('me');
  const { data, isPending: loading, error: fetchError, refetch } = useAsyncResource<LinkedAccount[]>(listLinkedAccounts, []);
  const accounts = data ?? EMPTY;
  // Fetch error is owned by the hook; mutation (unlink) errors are local. Show either.
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;
  const [confirmRemove, setConfirmRemove] = useState<LinkedAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function doRemove(acc: LinkedAccount) {
    setBusyId(acc.id);
    const res = await unlinkAccount({ providerId: acc.providerId, accountId: acc.accountId });
    setBusyId(null);
    setConfirmRemove(null);
    if (!res.ok) { setActionError(res.error); return; }
    setActionError(null);
    refetch();
  }

  const removeName = confirmRemove
    ? (PROVIDER_META[confirmRemove.providerId]?.name ?? confirmRemove.providerId)
    : '';

  return (
    <MeShell title={t('connectedApps.title')} subtitle={t('connectedApps.subtitle')}>
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>
      )}
      <Section title={t('connectedApps.providers.title')} hint={t('connectedApps.providers.hint')}>
        {loading ? (
          <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
            <SkeletonText lines={3} />
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState title={t('connectedApps.list.empty')} />
        ) : (
          <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
            {accounts.map((acc) => {
              const meta = PROVIDER_META[acc.providerId];
              const Icon = meta?.Icon;
              return (
                <div
                  key={acc.id}
                  className="flex items-start gap-3 px-3 py-3 [&:not(:first-child)]:border-t"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  {Icon && <Icon className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
                      {meta?.name ?? acc.providerId}
                    </span>
                    {acc.accountId && (
                      <span className="text-sm truncate" style={{ color: 'var(--fg-default)' }}>{acc.accountId}</span>
                    )}
                    {acc.scopes.length > 0 && (
                      <span className="text-xs font-mono truncate" style={{ color: 'var(--fg-subtle)' }}>
                        {acc.scopes.join(', ')}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => { setConfirmRemove(acc); }}>
                    {t('connectedApps.list.disconnect')}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {confirmRemove && (
        <ConfirmDialog
          open
          busy={busyId === confirmRemove.id}
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { void doRemove(confirmRemove); }}
          title={t('connectedApps.remove.title', { provider: removeName })}
          description={t('connectedApps.remove.identityBody', { provider: removeName })}
          confirmLabel={t('connectedApps.list.disconnect')}
        />
      )}
    </MeShell>
  );
}
