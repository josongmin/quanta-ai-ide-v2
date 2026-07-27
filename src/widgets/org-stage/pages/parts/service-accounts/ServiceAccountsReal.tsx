import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useParams } from '@tanstack/react-router';
import { Bot, Plus, Trash2 } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, EmptyState, InlineError, SkeletonText,
  SettingsModal, RevealOnceModal, ConfirmDialog,
} from '@shared/ui';
import {
  useOrg, listServiceAccounts, createServiceAccount, revokeServiceAccount,
  type ServiceAccountRecord, type ServiceAccountCreated,
} from '@entities/org';
import { shortDate } from '../../../parts/format';

// Real org service accounts (machine API keys) over accounts /v1/service-accounts.
// Create requires a Team+ plan (backend 403 → surfaced). Plaintext key shown once.
function expiryOptions(t: TFunction<'org'>): { label: string; days: number | null }[] {
  return [
    { label: t('serviceAccounts.create.days90'), days: 90 },
    { label: t('serviceAccounts.create.year1'), days: 365 },
    { label: t('serviceAccounts.create.noExpiry'), days: null },
  ];
}
// Only the day values are load-bearing for the create call; labels are localized.
const EXPIRY_DAYS: (number | null)[] = [90, 365, null];

const EMPTY: ServiceAccountRecord[] = [];

export function ServiceAccountsReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [accounts, setAccounts] = useState<ServiceAccountRecord[]>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<ServiceAccountCreated | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ServiceAccountRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void listServiceAccounts(orgId).then((res) => {
      if (!active) return;
      if (res.ok) { setAccounts(res.data); setError(null); }
      else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, nonce]);

  const refetch = () => { setNonce((n) => n + 1); };

  async function doRevoke(a: ServiceAccountRecord) {
    setBusyId(a.id);
    const res = await revokeServiceAccount(orgId, a.id);
    setBusyId(null);
    setConfirmRevoke(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('serviceAccounts.title')}
      subtitle={t('serviceAccounts.subtitleReal')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }} disabled={!orgId}>
          {t('serviceAccounts.new')}
        </Button>
      }
    >
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>
      )}

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      ) : (
        <DataTable<ServiceAccountRecord>
          columns="1fr 140px 130px 130px 44px"
          headers={[{ header: t('serviceAccounts.table.name') }, { header: t('serviceAccounts.table.prefix') }, { header: t('serviceAccounts.table.created') }, { header: t('serviceAccounts.table.expires') }, { header: '' }]}
          rows={accounts}
          rowKey={(a) => a.id}
          empty={<EmptyState title={t('serviceAccounts.empty.title')} subtitle={t('serviceAccounts.empty.subtitle')} />}
          renderRow={(a) => (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{a.name ?? t('serviceAccounts.fallbackName')}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{a.start ?? a.prefix ?? '—'}…</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(a.createdAt)}</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(a.expiresAt)}</span>
              <RowMenu
                items={[{ label: t('serviceAccounts.revoke.menu'), icon: Trash2, danger: true, disabled: busyId === a.id, onClick: () => { setConfirmRevoke(a); } }]}
              />
            </>
          )}
        />
      )}

      {createOpen && orgId && (
        <CreateServiceModal
          orgId={orgId}
          onClose={() => { setCreateOpen(false); }}
          onCreated={(created) => { setCreateOpen(false); setSaved(false); setRevealed(created); refetch(); }}
        />
      )}
      {revealed && (
        <RevealOnceModal
          title={t('serviceAccounts.keyCreated', { name: revealed.name ?? t('serviceAccounts.keyFallback') })}
          value={revealed.key}
          onDismiss={() => { setRevealed(null); }}
          onSaved={() => { setSaved(true); }}
          saved={saved}
          titleMono
        />
      )}
      {confirmRevoke && (
        <ConfirmDialog
          open
          busy={busyId === confirmRevoke.id}
          onCancel={() => { setConfirmRevoke(null); }}
          onConfirm={() => { void doRevoke(confirmRevoke); }}
          title={t('serviceAccounts.revoke.title', { name: confirmRevoke.name ?? t('serviceAccounts.fallbackName') })}
          confirmLabel={t('serviceAccounts.revoke.confirm')}
          description={t('serviceAccounts.revoke.description')}
        />
      )}
    </OrgShell>
  );
}

function CreateServiceModal({
  orgId, onClose, onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (created: ServiceAccountCreated) => void;
}) {
  const { t } = useTranslation('org');
  const [name, setName] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 1 year
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiry = expiryOptions(t);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await createServiceAccount(orgId, { name: name.trim(), expiresInDays: EXPIRY_DAYS[expiryIdx] ?? null });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onCreated(res.data);
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<Bot className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('serviceAccounts.create.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!name.trim() || busy} onClick={() => { void submit(); }}>
            {busy ? t('serviceAccounts.create.creating') : t('serviceAccounts.create.create')}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label={t('serviceAccounts.create.name')} value={name} onChange={(e) => { setName(e.target.value.slice(0, 80)); }} placeholder={t('serviceAccounts.create.namePlaceholder')} autoFocus />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('serviceAccounts.create.keyExpiration')}</span>
        <select
          value={expiryIdx}
          onChange={(e) => { setExpiryIdx(Number(e.target.value)); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          {expiry.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}
        </select>
      </label>
    </SettingsModal>
  );
}
