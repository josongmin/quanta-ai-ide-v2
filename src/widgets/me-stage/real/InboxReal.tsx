import { useEffect, useRef, useState } from 'react';
import { useAsyncResource } from '@shared/lib';
import { formatDateShort } from '@shared/i18n';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CheckCheck, Shield, CreditCard, Users, KeyRound, Building2 } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Button } from '@shared/ui/forms';
import { EmptyState, InlineError, SkeletonText } from '@shared/ui';
import {
  listNotifications, markNotificationRead, markAllNotificationsRead,
  type NotificationRecord,
} from '@entities/session';

// Real personal inbox over accounts /v1/notifications — the audit-spine 3rd sink.
// Honest to the data: an activity feed of account/org events, not the product
// mention/review mock. Unread = brand dot + stronger text (no edge stripe, no
// grey fill — per house rules).
const ACTION_LABEL_KEY: Record<string, string> = {
  'org.member.invited': 'real.inbox.actions.orgMemberInvited',
  'org.member.removed': 'real.inbox.actions.orgMemberRemoved',
  'org.member.role_changed': 'real.inbox.actions.orgMemberRoleChanged',
  'org.invitation.canceled': 'real.inbox.actions.orgInvitationCanceled',
  'org.updated': 'real.inbox.actions.orgUpdated',
  'org.deleted': 'real.inbox.actions.orgDeleted',
  'org.team.created': 'real.inbox.actions.orgTeamCreated',
  'org.team.deleted': 'real.inbox.actions.orgTeamDeleted',
  'security.2fa_enabled': 'real.inbox.actions.security2faEnabled',
  'security.2fa_disabled': 'real.inbox.actions.security2faDisabled',
  'security.password_changed': 'real.inbox.actions.securityPasswordChanged',
  'security.session_revoked': 'real.inbox.actions.securitySessionRevoked',
  'apikey.created': 'real.inbox.actions.apikeyCreated',
  'apikey.revoked': 'real.inbox.actions.apikeyRevoked',
  'billing.subscription.updated': 'real.inbox.actions.billingSubscriptionUpdated',
  'billing.payment_failed': 'real.inbox.actions.billingPaymentFailed',
};
const labelFor = (a: string, t: TFunction) => {
  const key = ACTION_LABEL_KEY[a];
  return key ? t(key) : a;
};

function iconFor(action: string) {
  if (action.startsWith('security.')) return Shield;
  if (action.startsWith('billing.')) return CreditCard;
  if (action.startsWith('apikey.')) return KeyRound;
  if (action.startsWith('org.member') || action.startsWith('org.invitation')) return Users;
  return Building2;
}

function relTime(iso: string | null, t: TFunction): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return t('real.inbox.relTime.justNow');
  const m = Math.round(s / 60);
  if (m < 60) return t('real.inbox.relTime.minutes', { count: m });
  const h = Math.round(m / 60);
  if (h < 24) return t('real.inbox.relTime.hours', { count: h });
  const d = Math.round(h / 24);
  if (d < 30) return t('real.inbox.relTime.days', { count: d });
  return formatDateShort(iso);
}

const NONE: NotificationRecord[] = [];

type InboxPage = { notifications: NotificationRecord[]; nextCursor: string | null; unreadCount: number };

export function InboxReal() {
  const { t } = useTranslation('me');
  const [unreadOnly, setUnreadOnly] = useState(false);
  // The first-page fetch is owned by the hook (stale-guard + skeleton). Its
  // result seeds the locally-mutable feed state below (loadMore appends, markOne
  // toggles read optimistically), so we mirror data → items/cursor/unread.
  const { data, isPending: loading, error: fetchError, refetch } = useAsyncResource<InboxPage>(
    async () => {
      const res = await listNotifications({ unreadOnly });
      return res.ok ? { ok: true, data: res.data } : { ok: false, error: res.error };
    },
    [unreadOnly],
  );
  const [items, setItems] = useState<NotificationRecord[]>(NONE);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!data) return;
    /* eslint-disable react-hooks/set-state-in-effect -- seed locally-mutable feed state from the hook's fetched page */
    setItems(data.notifications);
    setCursor(data.nextCursor);
    setUnread(data.unreadCount);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [data]);

  const [loadingMore, setLoadingMore] = useState(false);
  // Fetch error is owned by the hook; mutation (load-more / mark-read) errors are local. Show either.
  const [actionError, setActionError] = useState<string | null>(null);
  const error = fetchError ?? actionError;
  const [busy, setBusy] = useState(false);
  // await 이후 setState가 언마운트/동시요청에 안전하도록.
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Set<string>>(new Set());
  useEffect(() => () => { mountedRef.current = false; }, []);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const res = await listNotifications({ cursor, unreadOnly });
    if (!mountedRef.current) return;
    setLoadingMore(false);
    if (!res.ok) { setActionError(res.error); return; }
    setItems((prev) => [...prev, ...res.data.notifications]);
    setCursor(res.data.nextCursor);
    setUnread(res.data.unreadCount);
  }

  async function markOne(n: NotificationRecord) {
    // 이미 읽음이거나 같은 행이 처리중이면 무시(더블클릭 중복감소 방지).
    if (n.read || inFlightRef.current.has(n.id)) return;
    inFlightRef.current.add(n.id);
    // 낙관적 반영 — 실패 시 롤백.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    const res = await markNotificationRead(n.id);
    inFlightRef.current.delete(n.id);
    if (!mountedRef.current) return;
    if (!res.ok) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      setUnread((u) => u + 1);
      setActionError(res.error);
    }
  }

  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    const res = await markAllNotificationsRead();
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  return (
    <MeShell
      title={t('real.inbox.title')}
      subtitle={t('real.inbox.subtitle')}
      topRight={
        <Button
          variant="ghost" size="md"
          leading={<CheckCheck className="w-3.5 h-3.5" />}
          disabled={busy || unread === 0}
          onClick={() => { void markAll(); }}
        >
          {t('real.inbox.markAllRead')}
        </Button>
      }
    >
      <div className="flex items-center gap-1.5 mb-3">
        {([['all', t('real.inbox.all')], ['unread', unread > 0 ? t('real.inbox.unreadCount', { count: unread }) : t('real.inbox.unread')]] as const).map(([id, label]) => {
          const on = (id === 'unread') === unreadOnly;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              disabled={loadingMore}
              onClick={() => { setUnreadOnly(id === 'unread'); }}
              className="h-7 px-3 rounded-md text-sm transition-colors disabled:opacity-60"
              style={{
                background: on ? 'var(--bg-surface-muted)' : 'transparent',
                border: `1px solid ${on ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
                color: on ? 'var(--fg-strong)' : 'var(--fg-muted)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setActionError(null); refetch(); }} /></div>}

      {loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={6} /></div>
      ) : items.length === 0 ? (
        <EmptyState title={t('real.inbox.emptyTitle')} subtitle={unreadOnly ? t('real.inbox.emptyUnread') : t('real.inbox.emptyAll')} />
      ) : (
        <div className="flex flex-col rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          {items.map((n, i) => {
            const Icon = iconFor(n.action);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => { void markOne(n); }}
                className="flex items-center gap-3 px-3.5 h-14 text-left transition-colors hover:bg-[var(--bg-surface-muted)]"
                style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-muted)' }}
              >
                <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'var(--bg-surface-muted)' }}>
                  <Icon className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} />
                </span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className={`text-sm truncate ${n.read ? '' : 'font-semibold'}`} style={{ color: n.read ? 'var(--fg-muted)' : 'var(--fg-strong)' }}>
                    {!n.read && <span className="sr-only">{t('real.inbox.unreadPrefix')}</span>}
                    {labelFor(n.action, t)}
                  </span>
                  <span className="text-2xs truncate" style={{ color: 'var(--fg-subtle)' }}>
                    {n.target ? t('real.inbox.targetByActor', { target: n.target, actor: n.actor }) : t('real.inbox.byActor', { actor: n.actor })}
                  </span>
                </span>
                <span className="shrink-0 text-2xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{relTime(n.createdAt, t)}</span>
                {/* 미읽음 표시 = 인라인 브랜드 점(엣지 스트라이프 아님) */}
                <span
                  className="shrink-0 w-2 h-2 rounded-full"
                  style={{ background: n.read ? 'transparent' : 'var(--fg-accent)' }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      )}

      {cursor && !loading && (
        <div className="mt-3 flex justify-center">
          <Button variant="ghost" size="md" disabled={loadingMore} onClick={() => { void loadMore(); }}>
            {loadingMore ? t('real.inbox.loading') : t('real.inbox.loadMore')}
          </Button>
        </div>
      )}
    </MeShell>
  );
}
