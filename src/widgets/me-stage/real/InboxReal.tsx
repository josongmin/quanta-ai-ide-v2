import { useCallback, useEffect, useRef, useState } from 'react';
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
const ACTION_LABEL: Record<string, string> = {
  'org.member.invited': 'Member invited',
  'org.member.removed': 'Member removed',
  'org.member.role_changed': 'Member role changed',
  'org.invitation.canceled': 'Invitation canceled',
  'org.updated': 'Organization updated',
  'org.deleted': 'Organization deleted',
  'org.team.created': 'Team created',
  'org.team.deleted': 'Team deleted',
  'security.2fa_enabled': 'Two-factor enabled',
  'security.2fa_disabled': 'Two-factor disabled',
  'security.password_changed': 'Password changed',
  'security.session_revoked': 'Session revoked',
  'apikey.created': 'API key created',
  'apikey.revoked': 'API key revoked',
  'billing.subscription.updated': 'Subscription updated',
  'billing.payment_failed': 'Payment failed',
};
const labelFor = (a: string) => ACTION_LABEL[a] ?? a;

function iconFor(action: string) {
  if (action.startsWith('security.')) return Shield;
  if (action.startsWith('billing.')) return CreditCard;
  if (action.startsWith('apikey.')) return KeyRound;
  if (action.startsWith('org.member') || action.startsWith('org.invitation')) return Users;
  return Building2;
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m.toString()}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h.toString()}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d.toString()}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const NONE: NotificationRecord[] = [];

export function InboxReal() {
  const [items, setItems] = useState<NotificationRecord[]>(NONE);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  // await 이후 setState가 언마운트/동시요청에 안전하도록.
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Set<string>>(new Set());
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    let active = true;
    void listNotifications({ unreadOnly }).then((res) => {
      if (!active) return;
      if (res.ok) {
        setItems(res.data.notifications);
        setCursor(res.data.nextCursor);
        setUnread(res.data.unreadCount);
        setError(null);
      } else setError(res.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [unreadOnly, nonce]);

  const refetch = useCallback(() => { setNonce((n) => n + 1); }, []);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const res = await listNotifications({ cursor, unreadOnly });
    if (!mountedRef.current) return;
    setLoadingMore(false);
    if (!res.ok) { setError(res.error); return; }
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
      setError(res.error);
    }
  }

  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    const res = await markAllNotificationsRead();
    if (!mountedRef.current) return;
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }

  return (
    <MeShell
      title="Inbox"
      subtitle="Account and organization activity. Security alerts about your account, plus changes across orgs you administer."
      topRight={
        <Button
          variant="ghost" size="md"
          leading={<CheckCheck className="w-3.5 h-3.5" />}
          disabled={busy || unread === 0}
          onClick={() => { void markAll(); }}
        >
          Mark all read
        </Button>
      }
    >
      <div className="flex items-center gap-1.5 mb-3">
        {([['all', 'All'], ['unread', `Unread${unread > 0 ? ` · ${unread.toString()}` : ''}`]] as const).map(([id, label]) => {
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

      {error && <div className="mb-3"><InlineError message={error} onRetry={() => { setError(null); refetch(); }} /></div>}

      {loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={6} /></div>
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" subtitle={unreadOnly ? 'Nothing unread.' : 'Account and org activity will show up here.'} />
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
                    {!n.read && <span className="sr-only">Unread: </span>}
                    {labelFor(n.action)}
                  </span>
                  <span className="text-2xs truncate" style={{ color: 'var(--fg-subtle)' }}>
                    {n.target ? `${n.target} · ` : ''}by {n.actor}
                  </span>
                </span>
                <span className="shrink-0 text-2xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>{relTime(n.createdAt)}</span>
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
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </MeShell>
  );
}
