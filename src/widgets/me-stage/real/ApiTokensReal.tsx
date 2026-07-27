import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
const EXPIRY: { labelKey: string; days: number | null }[] = [
  { labelKey: 'real.tokens.expiry.days30', days: 30 },
  { labelKey: 'real.tokens.expiry.days60', days: 60 },
  { labelKey: 'real.tokens.expiry.days90', days: 90 },
  { labelKey: 'real.tokens.expiry.year1', days: 365 },
  { labelKey: 'real.tokens.expiry.none', days: null },
];

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY: ApiKeyRecord[] = [];

export function ApiTokensReal() {
  const { t } = useTranslation('me');
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

  async function doRevoke(rec: ApiKeyRecord) {
    setBusyId(rec.id);
    const res = await revokePersonalToken(rec.id);
    setBusyId(null);
    setConfirmRevoke(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }

  return (
    <MeShell
      title={t('real.tokens.title')}
      subtitle={t('real.tokens.subtitle')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }}>
          {t('real.tokens.newToken')}
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
          headers={[{ header: t('real.tokens.colToken') }, { header: t('real.tokens.colPrefix') }, { header: t('real.tokens.colCreated') }, { header: t('real.tokens.colExpires') }, { header: '' }]}
          rows={tokens}
          rowKey={(rec) => rec.id}
          empty={<EmptyState title={t('real.tokens.emptyTitle')} subtitle={t('real.tokens.emptySubtitle')} />}
          renderRow={(rec) => (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Key className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{rec.name ?? t('real.tokens.fallbackName')}</span>
              </div>
              <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{rec.start ?? rec.prefix ?? '—'}…</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(rec.createdAt)}</span>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(rec.expiresAt)}</span>
              <RowMenu
                items={[{ label: t('real.tokens.revokeToken'), icon: Trash2, danger: true, disabled: busyId === rec.id, onClick: () => { setConfirmRevoke(rec); } }]}
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
          title={t('real.tokens.createdTitle', { name: revealed.name ?? t('real.tokens.fallbackName') })}
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
          title={t('real.tokens.revokeConfirmTitle', { name: confirmRevoke.name ?? t('real.tokens.fallbackName') })}
          confirmLabel={t('real.tokens.revoke')}
          description={t('real.tokens.revokeDescription')}
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
  const { t } = useTranslation('me');
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
      title={t('real.tokens.createTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!name.trim() || busy} onClick={() => { void submit(); }}>
            {busy ? t('real.tokens.generating') : t('real.tokens.generate')}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label={t('real.tokens.name')} value={name} onChange={(e) => { setName(e.target.value.slice(0, 80)); }} placeholder={t('real.tokens.namePlaceholder')} autoFocus />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('real.tokens.expiration')}</span>
        <select
          value={expiryIdx}
          onChange={(e) => { setExpiryIdx(Number(e.target.value)); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          {EXPIRY.map((x, i) => <option key={x.labelKey} value={i}>{t(x.labelKey)}</option>)}
        </select>
      </label>
    </SettingsModal>
  );
}
