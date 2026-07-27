import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
function eventCatalog(t: TFunction<'org'>): { id: string; label: string }[] {
  return [
    { id: '*', label: t('webhooks.real.allEvents') },
    { id: 'org.member.invited', label: t('webhooks.real.memberInvited') },
    { id: 'org.member.removed', label: t('webhooks.real.memberRemoved') },
    { id: 'org.member.role_changed', label: t('webhooks.real.roleChanged') },
    { id: 'org.invitation.canceled', label: t('webhooks.real.invitationCanceled') },
    { id: 'org.updated', label: t('webhooks.real.orgUpdated') },
    { id: 'org.deleted', label: t('webhooks.real.orgDeleted') },
    { id: 'apikey.created', label: t('webhooks.real.apikeyCreated') },
    { id: 'apikey.revoked', label: t('webhooks.real.apikeyRevoked') },
    { id: 'billing.subscription.updated', label: t('webhooks.real.subscriptionUpdated') },
    { id: 'billing.payment_failed', label: t('webhooks.real.paymentFailed') },
  ];
}

const STATUS_VARIANT: Record<WebhookDeliveryRecord['status'], BadgeVariant> = {
  delivered: 'success', failed: 'danger', exhausted: 'warn', pending: 'neutral', sending: 'neutral',
};

const NO_EP: WebhookEndpointRecord[] = [];
const NO_DEL: WebhookDeliveryRecord[] = [];

export function WebhooksReal() {
  const { t } = useTranslation('org');
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
      title={t('webhooks.title')}
      subtitle={t('webhooks.subtitleReal')}
      topRight={
        <Button variant="primary" size="md" leading={<Plus className="w-3.5 h-3.5" />} onClick={() => { setCreateOpen(true); }} disabled={!orgId}>
          {t('webhooks.newEndpoint')}
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
            headers={[{ header: t('webhooks.table.endpoint') }, { header: t('webhooks.table.events') }, { header: t('webhooks.table.status') }, { header: '' }]}
            rows={endpoints}
            rowKey={(e) => e.id}
            empty={<EmptyState title={t('webhooks.empty.endpointsTitle')} subtitle={t('webhooks.empty.endpointsSub')} />}
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
                  {e.events.includes('*') ? t('webhooks.table.all') : e.events.length.toString()}
                </span>
                <Badge variant={e.enabled ? 'success' : 'neutral'} size="sm">{e.enabled ? t('webhooks.status.enabled') : t('webhooks.status.paused')}</Badge>
                <RowMenu
                  items={[
                    { label: e.enabled ? t('webhooks.action.pause') : t('webhooks.action.enable'), icon: e.enabled ? Pause : Play, disabled: busyId !== null, onClick: () => { void toggle(e); } },
                    { label: t('webhooks.action.deleteEndpoint'), icon: Trash2, danger: true, disabled: busyId !== null, onClick: () => { setConfirmDelete(e); } },
                  ]}
                />
              </>
            )}
          />

          <h2 className="text-base font-semibold mt-8 mb-2 px-1" style={{ color: 'var(--fg-strong)' }}>{t('webhooks.recentDeliveries')}</h2>
          <DataTable<WebhookDeliveryRecord>
            columns="1fr 110px 90px 130px 44px"
            headers={[{ header: t('webhooks.table.event') }, { header: t('webhooks.table.status') }, { header: t('webhooks.table.attempts') }, { header: t('webhooks.table.when') }, { header: '' }]}
            rows={deliveries}
            rowKey={(d) => d.id}
            empty={<EmptyState title={t('webhooks.empty.deliveriesTitle')} subtitle={t('webhooks.empty.deliveriesSub')} />}
            renderRow={(d) => (
              <>
                <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>{d.event}</span>
                <Badge variant={STATUS_VARIANT[d.status]} size="sm">
                  {t(`webhooks.deliveryStatus.${d.status}`)}{d.responseStatus ? ` · ${d.responseStatus.toString()}` : ''}
                </Badge>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{d.attempts}</span>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(d.createdAt)}</span>
                <RowMenu items={[{ label: t('webhooks.action.replay'), icon: RotateCcw, disabled: busyId !== null, onClick: () => { void replay(d); } }]} />
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
          title={t('webhooks.signingSecret.title')}
          value={revealed.secret}
          description={t('webhooks.signingSecret.description')}
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
          title={t('webhooks.deleteDialog.title')}
          confirmLabel={t('webhooks.deleteDialog.confirm')}
          description={t('webhooks.deleteDialog.description')}
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
  const { t } = useTranslation('org');
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
      title={t('webhooks.create.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="md" disabled={!valid || busy} onClick={() => { void submit(); }}>
            {busy ? t('webhooks.create.creating') : t('webhooks.create.create')}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <Field label={t('webhooks.create.payloadUrl')} value={url} onChange={(e) => { setUrl(e.target.value); }} placeholder={t('webhooks.create.urlPlaceholder')} autoFocus />
      <Field label={t('webhooks.create.description')} value={description} onChange={(e) => { setDescription(e.target.value.slice(0, 200)); }} placeholder={t('webhooks.create.descPlaceholder')} />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('webhooks.create.events')}</span>
        <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto p-1">
          {eventCatalog(t).map((ev) => {
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
