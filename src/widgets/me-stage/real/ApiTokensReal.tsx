import { useEffect, useState } from 'react';
import { Key, Plus, Trash2 } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, EmptyState, InlineError, SkeletonText,
  SettingsModal, RevealOnceModal, ConfirmDialog,
} from '@shared/ui';
import {
  listPersonalTokens, createPersonalToken, revokePersonalToken,
  type ApiKeyRecord, type ApiKeyCreated,
} from '@entities/session';

// Real personal access tokens over accounts /v1/tokens. The plaintext token is
// shown exactly once (RevealOnceModal) right after creation.
const EXPIRY: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiry', days: null },
];

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY: ApiKeyRecord[] = [];

export function ApiTokensReal() {
  const [tokens, setTokens] = useState<ApiKeyRecord[]>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<ApiKeyCreated | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listPersonalTokens().then((res) => {
      if (!active) return;
      if (res.ok) { setTokens(res.data); setError(null); }
      else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [nonce]);

  const refetch = () => { setNonce((n) => n + 1); };

  async function doRevoke(t: ApiKeyRecord) {
    setBusyId(t.id);
    const res = await revokePersonalToken(t.id);
    setBusyId(null);
    setConfirmRevoke(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }

  return (
    <MeShell
      title="API tokens"
      subtitle="Personal access tokens for the API and CLI. Treat them like passwords."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
          New token
        </Button>
      }
    >
      {error && (
        <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>
      )}

      {loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      ) : (
        <DataTable<ApiKeyRecord>
          columns="1fr 150px 130px 130px 44px"
          headers={[{ header: 'Token' }, { header: 'Prefix' }, { header: 'Created' }, { header: 'Expires' }, { header: '' }]}
          rows={tokens}
          rowKey={(t) => t.id}
          empty={<EmptyState title="No tokens yet" subtitle="Create a token to use the API or CLI." />}
          renderRow={(t) => (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Key className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{t.name ?? 'token'}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{t.start ?? t.prefix ?? '—'}…</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(t.createdAt)}</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(t.expiresAt)}</span>
              <RowMenu
                items={[{ label: 'Revoke token', icon: Trash2, danger: true, disabled: busyId === t.id, onClick: () => { setConfirmRevoke(t); } }]}
              />
            </>
          )}
        />
      )}

      {createOpen && (
        <CreateTokenModal
          onClose={() => { setCreateOpen(false); }}
          onCreated={(created) => { setCreateOpen(false); setSaved(false); setRevealed(created); refetch(); }}
        />
      )}
      {revealed && (
        <RevealOnceModal
          title={`Token "${revealed.name ?? 'token'}" created`}
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
          title={`Revoke "${confirmRevoke.name ?? 'token'}"?`}
          confirmLabel="Revoke"
          description="Any client using this token will immediately lose access. This can't be undone."
        />
      )}
    </MeShell>
  );
}

function CreateTokenModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (created: ApiKeyCreated) => void;
}) {
  const [name, setName] = useState('');
  const [expiryIdx, setExpiryIdx] = useState(2); // default 90 days
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await createPersonalToken({ name: name.trim(), expiresInDays: EXPIRY[expiryIdx]?.days ?? null });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onCreated(res.data);
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<Key className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title="New API token"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!name.trim() || busy} onClick={() => { void submit(); }}>
            {busy ? 'Generating…' : 'Generate token'}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label="Name" value={name} onChange={(e) => { setName(e.target.value.slice(0, 80)); }} placeholder="CI pipeline" autoFocus />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>Expiration</span>
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
