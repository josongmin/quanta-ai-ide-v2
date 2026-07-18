import { useEffect, useRef, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Webhook, Plus, Trash2, Pause, Play, RotateCcw } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, Badge, EmptyState, InlineError, SkeletonText,
  SettingsModal, RevealOnceModal, ConfirmDialog, type BadgeVariant,
} from '@shared/ui';
import {
  useOrg, listWebhooks, createWebhook, updateWebhook, deleteWebhook,
  listDeliveries, replayDelivery,
  type WebhookEndpointRecord, type WebhookEndpointCreated, type WebhookDeliveryRecord,
} from '@entities/org';
import { shortDate } from '../../../parts/format';

// Real org webhooks over accounts /v1/webhooks. Delivers audit-spine events; the
// subscribable catalog is the accounts audit actions (not product events).
const EVENT_CATALOG: { id: string; label: string }[] = [
  { id: '*', label: 'All events' },
  { id: 'org.member.invited', label: 'Member invited' },
  { id: 'org.member.removed', label: 'Member removed' },
  { id: 'org.member.role_changed', label: 'Role changed' },
  { id: 'org.invitation.canceled', label: 'Invitation canceled' },
  { id: 'org.updated', label: 'Org updated' },
  { id: 'org.deleted', label: 'Org deleted' },
  { id: 'apikey.created', label: 'API key created' },
  { id: 'apikey.revoked', label: 'API key revoked' },
  { id: 'billing.subscription.updated', label: 'Subscription updated' },
  { id: 'billing.payment_failed', label: 'Payment failed' },
];

const STATUS_VARIANT: Record<WebhookDeliveryRecord['status'], BadgeVariant> = {
  delivered: 'success', failed: 'danger', exhausted: 'warn', pending: 'neutral', sending: 'neutral',
};

const NO_EP: WebhookEndpointRecord[] = [];
const NO_DEL: WebhookDeliveryRecord[] = [];

export function WebhooksReal() {
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [endpoints, setEndpoints] = useState<WebhookEndpointRecord[]>(NO_EP);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>(NO_DEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<WebhookEndpointCreated | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WebhookEndpointRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const replayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    void Promise.all([listWebhooks(orgId), listDeliveries(orgId)]).then(([eps, dels]) => {
      if (!active) return;
      // endpoints 오류가 우선. deliveries만 실패하면 그 오류를 노출(조용히 빈
      // 목록으로 오인시키지 않는다).
      if (!eps.ok) { setError(eps.error); return; }
      setEndpoints(eps.data);
      if (dels.ok) { setDeliveries(dels.data); setError(null); } else setError(dels.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, nonce]);

  // 언마운트 시 replay 후 예약된 refetch 타이머 정리(setState-after-unmount 방지).
  useEffect(() => () => { if (replayTimer.current) clearTimeout(replayTimer.current); }, []);

  const refetch = () => { setNonce((n) => n + 1); };

  async function toggle(e: WebhookEndpointRecord) {
    if (busyId) return; // 어떤 변경이든 진행중이면 새 변경 차단(단일 실행)
    setBusyId(e.id);
    const res = await updateWebhook(orgId, e.id, { enabled: !e.enabled });
    if (!res.ok) { setError(res.error); setBusyId(null); return; }
    refetch();
    setBusyId(null);
  }
  async function doDelete(e: WebhookEndpointRecord) {
    setBusyId(e.id);
    const res = await deleteWebhook(orgId, e.id);
    setConfirmDelete(null);
    if (!res.ok) { setError(res.error); setBusyId(null); return; }
    refetch();
    setBusyId(null);
  }
  async function replay(d: WebhookDeliveryRecord) {
    if (busyId) return;
    setBusyId(d.id);
    const res = await replayDelivery(orgId, d.id);
    setBusyId(null);
    if (!res.ok) { setError(res.error); return; }
    if (replayTimer.current) clearTimeout(replayTimer.current);
    replayTimer.current = setTimeout(refetch, 500); // give the async delivery a beat
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="Webhooks"
      subtitle="HTTP callbacks fired from org events, signed with HMAC-SHA256. Each endpoint subscribes to a subset of events."
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }} disabled={!orgId}>
          New endpoint
        </Button>
      }
    >
      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>}

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={5} /></div>
      ) : (
        <>
          <DataTable<WebhookEndpointRecord>
            columns="1fr 90px 110px 44px"
            headers={[{ header: 'Endpoint' }, { header: 'Events' }, { header: 'Status' }, { header: '' }]}
            rows={endpoints}
            rowKey={(e) => e.id}
            empty={<EmptyState title="No endpoints" subtitle="Add an endpoint to receive signed event callbacks." />}
            renderRow={(e) => (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Webhook className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                  <span className="flex flex-col min-w-0">
                    <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{e.url}</span>
                    {e.description && <span className="text-sm truncate" style={{ color: 'var(--fg-subtle)' }}>{e.description}</span>}
                  </span>
                </div>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                  {e.events.includes('*') ? 'All' : e.events.length.toString()}
                </span>
                <Badge variant={e.enabled ? 'success' : 'neutral'} size="sm">{e.enabled ? 'Enabled' : 'Paused'}</Badge>
                <RowMenu
                  items={[
                    { label: e.enabled ? 'Pause' : 'Enable', icon: e.enabled ? Pause : Play, disabled: busyId !== null, onClick: () => { void toggle(e); } },
                    { label: 'Delete endpoint', icon: Trash2, danger: true, disabled: busyId !== null, onClick: () => { setConfirmDelete(e); } },
                  ]}
                />
              </>
            )}
          />

          <h2 className="text-base font-semibold mt-8 mb-2 px-1" style={{ color: 'var(--fg-strong)' }}>Recent deliveries</h2>
          <DataTable<WebhookDeliveryRecord>
            columns="1fr 110px 90px 130px 44px"
            headers={[{ header: 'Event' }, { header: 'Status' }, { header: 'Attempts' }, { header: 'When' }, { header: '' }]}
            rows={deliveries}
            rowKey={(d) => d.id}
            empty={<EmptyState title="No deliveries yet" subtitle="Events will show here once endpoints receive them." />}
            renderRow={(d) => (
              <>
                <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>{d.event}</span>
                <Badge variant={STATUS_VARIANT[d.status]} size="sm">
                  {d.status}{d.responseStatus ? ` · ${d.responseStatus.toString()}` : ''}
                </Badge>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{d.attempts}</span>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(d.createdAt)}</span>
                <RowMenu items={[{ label: 'Replay', icon: RotateCcw, disabled: busyId !== null, onClick: () => { void replay(d); } }]} />
              </>
            )}
          />
        </>
      )}

      {createOpen && orgId && (
        <CreateWebhookModal
          orgId={orgId}
          onClose={() => { setCreateOpen(false); }}
          onCreated={(created) => { setCreateOpen(false); setSaved(false); setRevealed(created); refetch(); }}
        />
      )}
      {revealed && (
        <RevealOnceModal
          title="Signing secret"
          value={revealed.secret}
          description="Verify each delivery's x-p0-signature header (HMAC-SHA256 of the body) with this secret. Shown once."
          onDismiss={() => { setRevealed(null); }}
          onSaved={() => { setSaved(true); }}
          saved={saved}
          titleMono
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          open
          busy={busyId === confirmDelete.id}
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { void doDelete(confirmDelete); }}
          title="Delete this endpoint?"
          confirmLabel="Delete"
          description="It will immediately stop receiving events. Delivery history is retained."
        />
      )}
    </OrgShell>
  );
}

function CreateWebhookModal({
  orgId, onClose, onCreated,
}: {
  orgId: string;
  onClose: () => void;
  onCreated: (created: WebhookEndpointCreated) => void;
}) {
  const [url, setUrl] = useState('https://');
  const [description, setDescription] = useState('');
  const [events, setEvents] = useState<Set<string>>(new Set(['*']));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^https?:\/\/.+/.test(url) && events.size > 0;

  function toggleEvent(id: string) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (id === '*') return new Set(['*']); // 'all' is exclusive
      next.delete('*');
      if (next.has(id)) next.delete(id); else next.add(id);
      return next.size === 0 ? new Set(['*']) : next;
    });
  }

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const res = await createWebhook(orgId, {
      url: url.trim(),
      description: description.trim() || null,
      events: [...events],
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onCreated(res.data);
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="md"
      icon={<Webhook className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title="New webhook endpoint"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!valid || busy} onClick={() => { void submit(); }}>
            {busy ? 'Creating…' : 'Create endpoint'}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label="Payload URL" value={url} onChange={(e) => { setUrl(e.target.value); }} placeholder="https://hooks.example.com/p0" autoFocus />
      <Field label="Description (optional)" value={description} onChange={(e) => { setDescription(e.target.value.slice(0, 200)); }} placeholder="Internal warehouse mirror" />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>Events</span>
        <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto p-1">
          {EVENT_CATALOG.map((ev) => {
            const on = events.has(ev.id);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => { toggleEvent(ev.id); }}
                className="flex items-center gap-2 h-8 px-2.5 rounded-md text-sm text-left transition-colors"
                style={{
                  background: on ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                  border: `1px solid ${on ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
                  color: on ? 'var(--fg-strong)' : 'var(--fg-muted)',
                }}
              >
                {ev.label}
              </button>
            );
          })}
        </div>
      </div>
    </SettingsModal>
  );
}
