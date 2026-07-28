import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useParams } from '@tanstack/react-router';
import { Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import { EmptyState, InlineError, SkeletonText } from '@shared/ui';
import { accountsApi } from '@shared/auth';
import { apiErrorMessage } from '@shared/api';
import { useAsyncResource, useAppendedPages } from '@shared/lib';
import { useOrg } from '@entities/org';

// Real audit trail over `GET /v1/audit/:orgId` (action/actor/date filters +
// cursor pagination). The accounts store records actor/action/target/payload/
// ip/at; we render those honestly and expand the raw payload. Requires the
// `audit.read` permission — a 403 is surfaced as such.
//
// NOTE: DTO + action list mirror accounts' audit contract (@p0/contracts audit);
// replace with codegen from `<accountsUrl>/openapi.json` when wired into CI.
type AuditEntryDTO = {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  payload: unknown;
  ip: string | null;
  at: string;
};
type AuditResponse = { entries?: AuditEntryDTO[]; nextCursor?: string | null };

// Known actions (mirror of the accounts auditAction enum) for the filter.
function auditActions(t: TFunction<'org'>): { value: string; label: string }[] {
  return [
    { value: '', label: t('audit.actions.all') },
    { value: 'org.member.invited', label: t('audit.actions.orgMemberInvited') },
    { value: 'org.member.removed', label: t('audit.actions.orgMemberRemoved') },
    { value: 'org.member.role_changed', label: t('audit.actions.orgMemberRoleChanged') },
    { value: 'org.invitation.canceled', label: t('audit.actions.orgInvitationCanceled') },
    { value: 'org.updated', label: t('audit.actions.orgUpdated') },
    { value: 'org.deleted', label: t('audit.actions.orgDeleted') },
    { value: 'org.team.created', label: t('audit.actions.orgTeamCreated') },
    { value: 'org.team.deleted', label: t('audit.actions.orgTeamDeleted') },
    { value: 'security.2fa_enabled', label: t('audit.actions.security2faEnabled') },
    { value: 'security.2fa_disabled', label: t('audit.actions.security2faDisabled') },
    { value: 'security.password_changed', label: t('audit.actions.securityPasswordChanged') },
    { value: 'security.session_revoked', label: t('audit.actions.securitySessionRevoked') },
    { value: 'apikey.created', label: t('audit.actions.apikeyCreated') },
    { value: 'apikey.revoked', label: t('audit.actions.apikeyRevoked') },
    { value: 'billing.subscription.updated', label: t('audit.actions.billingSubscriptionUpdated') },
    { value: 'billing.payment_failed', label: t('audit.actions.billingPaymentFailed') },
  ];
}
const PAGE = 50;

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
function csvCell(v: string): string {
  // Formula-injection guard: a cell starting with = + - @ tab CR executes in
  // Excel/Sheets. Prefix with a quote to neutralize, then apply CSV quoting.
  const guarded = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}
function dayToIso(day: string, end: boolean): string | null {
  if (!day) return null;
  const d = new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AuditReal() {
  const { t } = useTranslation('org');
  const { org = '' } = useParams({ strict: false });
  const { detail, error: orgError, refetch: refetchOrg } = useOrg(org);
  const orgId = detail?.org.id ?? '';

  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useCallback((next: string | null): string => {
    const p = new URLSearchParams({ limit: String(PAGE) });
    if (action) p.set('action', action);
    const f = dayToIso(from, false);
    const t = dayToIso(to, true);
    if (f) p.set('from', f);
    if (t) p.set('to', t);
    if (next) p.set('cursor', next);
    return `/v1/audit/${orgId}?${p.toString()}`;
  }, [orgId, action, from, to]);

  // First page — refetch whenever the org or a server-side filter changes.
  const {
    data: firstPage, isPending: fetchPending, error: fetchError, refetch,
  } = useAsyncResource<AuditResponse>(
    async () => {
      // No org yet (its detail is still resolving) → skip the fetch; `loading`
      // below keeps the skeleton up until an orgId lands (matches the old effect,
      // which early-returned with loading=true and no request).
      if (!orgId) return { ok: true, data: {} };
      const res = await accountsApi.get<AuditResponse>(query(null));
      return res.ok
        ? { ok: true, data: res.data }
        : { ok: false, error: apiErrorMessage(res.error, t('audit.errorContext')) };
    },
    [orgId, query, t],
  );
  // No org yet (its detail is still resolving) → keep the skeleton, empty list.
  const loading = fetchPending || !orgId;

  // First page (+ cursor) come from the hook above; further pages are appended
  // locally and discarded when a new first page lands (org/filter change or
  // refetch). The shared hook owns the append + identity-keyed reset + the
  // stale-guard that drops an in-flight page whose filter changed mid-load.
  // Gate on orgId so a stale prior-org page never shows before its detail lands.
  const { items: entries, cursor, loadingMore, error: moreError, loadMore } = useAppendedPages<AuditResponse, AuditEntryDTO>(
    orgId ? firstPage : null,
    (p) => ({ items: Array.isArray(p.entries) ? p.entries : [], cursor: p.nextCursor ?? null }),
    async (c) => {
      const res = await accountsApi.get<AuditResponse>(query(c));
      return res.ok
        ? { ok: true, data: { items: Array.isArray(res.data.entries) ? res.data.entries : [], cursor: res.data.nextCursor ?? null } }
        : { ok: false, error: apiErrorMessage(res.error, t('audit.errorContext')) };
    },
  );
  const loadError = fetchError ?? moreError;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      `${e.actor} ${e.action} ${e.target ?? ''} ${e.ip ?? ''}`.toLowerCase().includes(needle));
  }, [entries, q]);

  function exportCsv() {
    const header = [t('audit.table.when'), t('audit.table.actor'), t('audit.table.action'), t('audit.table.target'), t('audit.table.ip')];
    const lines = [header, ...filtered.map((e) => [e.at, e.actor, e.action, e.target ?? '', e.ip ?? ''])];
    const csv = lines.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${org}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectStyle = {
    background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)',
    color: 'var(--fg-strong)',
  } as const;

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('audit.title')}
      subtitle={t('audit.subtitleReal')}
      topRight={
        <Button leading={<Download className="w-3.5 h-3.5" />} onClick={exportCsv} disabled={filtered.length === 0}>
          {t('audit.exportCsv')}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div
          className="flex items-center gap-2 h-9 px-3 rounded-md flex-1 min-w-[220px]"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)' }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder={t('audit.searchPlaceholderReal')}
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--fg-strong)' }}
          />
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); }} className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer" style={selectStyle}>
          {auditActions(t).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); }} className="h-9 rounded-md px-2.5 text-base outline-none" style={{ ...selectStyle, color: 'var(--fg-default)' }} />
        <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>→</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); }} className="h-9 rounded-md px-2.5 text-base outline-none" style={{ ...selectStyle, color: 'var(--fg-default)' }} />
      </div>

      {orgError ? (
        <InlineError message={orgError} onRetry={refetchOrg} />
      ) : loadError ? (
        <InlineError message={loadError} onRetry={() => { refetch(); }} />
      ) : loading ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={6} />
        </div>
      ) : (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
          <div
            className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
            style={{
              gridTemplateColumns: '20px 190px 160px 1fr 130px', gap: 12,
              background: 'var(--bg-surface-muted)', color: 'var(--fg-subtle)',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            <span />
            <span>{t('audit.table.when')}</span>
            <span>{t('audit.table.actor')}</span>
            <span>{t('audit.table.actionTarget')}</span>
            <span>{t('audit.table.ip')}</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={q || action || from || to ? t('audit.empty.matchingTitle') : t('audit.empty.noEventsTitle')}
              subtitle={q || action || from || to ? t('audit.empty.matchingSub') : t('audit.empty.noEventsSub')}
            />
          ) : filtered.map((e) => {
            const open = expanded === e.id;
            return (
              <div key={e.id} className="[&:not(:first-child)]:border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <button
                  type="button"
                  onClick={() => { setExpanded(open ? null : e.id); }}
                  className="grid items-center px-3 h-12 text-base w-full text-left transition-colors"
                  style={{ gridTemplateColumns: '20px 190px 160px 1fr 130px', gap: 12 }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  {open
                    ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />
                    : <ChevronRight className="w-3 h-3" style={{ color: 'var(--fg-subtle)' }} />}
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{fmtWhen(e.at)}</span>
                  <span className="truncate text-sm" style={{ color: 'var(--fg-strong)' }}>{e.actor}</span>
                  <span className="font-mono text-sm truncate" style={{ color: 'var(--fg-default)' }}>
                    {e.action}{e.target ? ` · ${e.target}` : ''}
                  </span>
                  <span className="font-mono text-sm" style={{ color: 'var(--fg-muted)' }}>{e.ip ?? '—'}</span>
                </button>
                {open && (
                  <div className="px-10 pb-3 pt-1" style={{ background: 'var(--bg-surface-muted)' }}>
                    <pre
                      className="font-mono text-sm p-2.5 rounded-md overflow-x-auto whitespace-pre-wrap"
                      style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-muted)', color: 'var(--fg-strong)' }}
                    >
                      {e.payload != null ? JSON.stringify(e.payload, null, 2) : t('audit.diff.noPayload')}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!orgError && !loadError && !loading && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
            {t('audit.eventsCount', { count: filtered.length })}{cursor ? t('audit.moreAvailable') : ''}.
          </span>
          {cursor && (
            <Button onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? t('audit.loading') : t('audit.loadMore')}
            </Button>
          )}
        </div>
      )}
    </OrgShell>
  );
}
