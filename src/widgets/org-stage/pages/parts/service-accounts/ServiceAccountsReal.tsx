import { useEffect, useState } from 'react';
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
const EXPIRY: { label: string; days: number | null }[] = [
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiry', days: null },
];

const EMPTY: ServiceAccountRecord[] = [];

export function ServiceAccountsReal() {
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
      title="Service accounts"
      subtitle="Machine identities for CI and workers. Each holds an API key scoped to this org."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }} disabled={!orgId}>
          New service account
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
          headers={[{ header: 'Name' }, { header: 'Prefix' }, { header: 'Created' }, { header: 'Expires' }, { header: '' }]}
          rows={accounts}
          rowKey={(a) => a.id}
          empty={<EmptyState title="No service accounts" subtitle="Create one to give CI or a worker API access." />}
          renderRow={(a) => (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Bot className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{a.name ?? 'service account'}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{a.start ?? a.prefix ?? '—'}…</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(a.createdAt)}</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(a.expiresAt)}</span>
              <RowMenu
                items={[{ label: 'Revoke key', icon: Trash2, danger: true, disabled: busyId === a.id, onClick: () => { setConfirmRevoke(a); } }]}
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
          title={`Service account "${revealed.name ?? 'key'}" created`}
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
          onCancel={() => { setConfirmRevoke(null); }}
          onConfirm={() => { void doRevoke(confirmRevoke); }}
          title={`Revoke "${confirmRevoke.name ?? 'service account'}"?`}
          confirmLabel="Revoke"
          description="Any CI job or worker using this key will immediately lose access. This can't be undone."
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
  const [name, setName] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(1); // default 1 year
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await createServiceAccount(orgId, { name: name.trim(), expiresInDays: EXPIRY[expiryIdx]?.days ?? null });
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
      title="New service account"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!name.trim() || busy} onClick={() => { void submit(); }}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label="Name" value={name} onChange={(e) => { setName(e.target.value.slice(0, 80)); }} placeholder="ci-deploy-bot" autoFocus />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>Key expiration</span>
        <select
          value={expiryIdx}
          onChange={(e) => { setExpiryIdx(Number(e.target.value)); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          {EXPIRY.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}
        </select>
      </label>
    </SettingsModal>
  );
}
