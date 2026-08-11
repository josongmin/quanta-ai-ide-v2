import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncResource, useAppendedPages } from '@shared/lib';
import { formatDateShort } from '@shared/i18n';
import { UserCog, Ban, ShieldCheck, ShieldMinus, LogIn, CreditCard, Building2, Users, Globe } from 'lucide-react';
import { AdminShell } from '../parts/AdminShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, Badge, EmptyState, InlineError, SkeletonText,
  SettingsModal, ConfirmDialog, type BadgeVariant,
} from '@shared/ui';
import {
  listUsers, banUser, unbanUser, impersonateUser, setPlatformRole,
  listOrgs, overridePlan, releaseDomain,
  type AdminUser, type AdminOrg, type AdminPlan,
  type AdminUserPage, type AdminOrgPage, type ReleaseDomainResult,
} from '@entities/admin';

// Real platform super-admin backoffice over accounts /v1/admin/*. Honest to the
// backend: user directory + moderation (ban/impersonate) and org directory +
// plan override. (The mock's jobs/flags/data-tools are product surfaces, not
// backed here.) House rules: no edge stripes, no grey selected-fills, intent
// tokens, named font-size classes.
const PLANS: AdminPlan[] = ['free', 'team', 'business', 'enterprise'];

const planVariant = (p: string): BadgeVariant => (p === 'business' || p === 'enterprise' ? 'success' : 'neutral');

export function AdminReal() {
  const { t } = useTranslation('admin');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Fetch errors are owned by the hooks; mutation (ban/unban/impersonate/plan/loadMore)
  // errors are local. Show either.
  const [actionError, setActionError] = useState<string | null>(null);

  // 유저는 검색어에 반응. orgs와 분리해 검색 타이핑이 org 페이지네이션을 리셋하지 않게.
  const usersRes = useAsyncResource<AdminUserPage>(() => listUsers({ search }), [search]);
  // orgs는 검색과 무관 — 명시 refetch에만 반응.
  const orgsRes = useAsyncResource<AdminOrgPage>(() => listOrgs(), []);

  // First page (+ cursor) from each hook; further pages are appended and reset on
  // a fresh first page via the shared useAppendedPages (identity-keyed reset +
  // stale-guard). Users and orgs paginate independently so searching users does
  // not reset org pagination.
  const usersPage = useAppendedPages<AdminUserPage, AdminUser>(
    usersRes.data,
    (p) => ({ items: p.users, cursor: p.nextCursor }),
    async (c) => {
      const res = await listUsers({ search, cursor: c });
      return res.ok ? { ok: true, data: { items: res.data.users, cursor: res.data.nextCursor } } : { ok: false, error: res.error };
    },
  );
  const orgsPage = useAppendedPages<AdminOrgPage, AdminOrg>(
    orgsRes.data,
    (p) => ({ items: p.orgs, cursor: p.nextCursor }),
    async (c) => {
      const res = await listOrgs({ cursor: c });
      return res.ok ? { ok: true, data: { items: res.data.orgs, cursor: res.data.nextCursor } } : { ok: false, error: res.error };
    },
  );
  const users = usersPage.items;
  const orgs = orgsPage.items;

  // loading = users first-load skeleton (matches the old single `loading` gate).
  const loading = usersRes.isPending;
  const error = usersRes.error ?? orgsRes.error ?? usersPage.error ?? orgsPage.error ?? actionError;
  const refetch = () => {
    setActionError(null);
    usersPage.clearError();
    orgsPage.clearError();
    usersRes.refetch();
    orgsRes.refetch();
  };

  // domain force-release
  const [domainInput, setDomainInput] = useState('');
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainResult, setDomainResult] = useState<ReleaseDomainResult | null>(null);

  async function doReleaseDomain() {
    const domain = domainInput.trim().toLowerCase();
    if (!domain || domainBusy) return;
    setDomainBusy(true);
    setActionError(null);
    setDomainResult(null);
    const res = await releaseDomain(domain);
    if (!mountedRef.current) return;
    setDomainBusy(false);
    if (!res.ok) { setActionError(res.error); return; }
    setDomainResult(res.data);
  }

  // moderation modals
  const [banFor, setBanFor] = useState<AdminUser | null>(null);
  const [impersonateFor, setImpersonateFor] = useState<AdminUser | null>(null);
  const [planFor, setPlanFor] = useState<AdminOrg | null>(null);

  async function doUnban(u: AdminUser) {
    if (busyId) return;
    setBusyId(u.id);
    const res = await unbanUser(u.id);
    if (!mountedRef.current) return;
    setBusyId(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }
  // Platform role toggle — promote a member to super-admin or demote an admin.
  async function doSetRole(u: AdminUser) {
    if (busyId) return;
    setBusyId(u.id);
    const res = await setPlatformRole(u.id, u.role === 'admin' ? 'user' : 'admin');
    if (!mountedRef.current) return;
    setBusyId(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }
  async function doBan(reason: string) {
    if (!banFor) return;
    setBusyId(banFor.id);
    const res = await banUser(banFor.id, reason.trim() || null);
    if (!mountedRef.current) return;
    setBusyId(null); setBanFor(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }
  async function doImpersonate() {
    if (!impersonateFor) return;
    setBusyId(impersonateFor.id);
    const res = await impersonateUser(impersonateFor.id);
    if (!mountedRef.current) return;
    setBusyId(null); setImpersonateFor(null);
    if (!res.ok) { setActionError(res.error); return; }
    // 세션 쿠키가 대상 유저로 스왑됨 → 그 유저 뷰로 진입.
    window.location.href = '/intelligence';
  }
  async function doOverridePlan(plan: AdminPlan, reason: string) {
    if (!planFor) return;
    setBusyId(planFor.id);
    const res = await overridePlan(planFor.id, plan, reason.trim() || null);
    if (!mountedRef.current) return;
    setBusyId(null); setPlanFor(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  return (
    <AdminShell active="overview">
      <div className="px-6 py-6 flex flex-col gap-8 max-w-[1100px] mx-auto w-full">
        <header>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg-strong)' }}>{t('title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{t('subtitle')}</p>
        </header>

        {error && <InlineError message={error} onRetry={() => { refetch(); }} />}

        {loading ? (
          <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={8} /></div>
        ) : (
          <>
            {/* Users */}
            <section id="users" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold inline-flex items-center gap-2" style={{ color: 'var(--fg-strong)' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} /> {t('sections.users')}
                </h2>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  placeholder={t('searchPlaceholder')}
                  aria-label="Search users by email or name"
                  className="w-64 h-9 rounded-md px-3 text-base outline-none"
                  style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
                />
              </div>
              <DataTable<AdminUser>
                columns="1fr 120px 110px 120px 44px"
                headers={[{ header: t('cols.user') }, { header: t('cols.role') }, { header: t('cols.status') }, { header: t('cols.joined') }, { header: '' }]}
                rows={users}
                rowKey={(u) => u.id}
                empty={<EmptyState title={t('empty.usersTitle')} subtitle={t('empty.usersSubtitle')} />}
                renderRow={(u) => (
                  <>
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{u.name ?? '—'}</span>
                      <span className="text-2xs truncate font-mono" style={{ color: 'var(--fg-subtle)' }}>{u.email}</span>
                    </span>
                    {u.role === 'admin' ? <Badge variant="info" size="sm">{t('badge.admin')}</Badge> : <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>{t('badge.member')}</span>}
                    <Badge variant={u.banned ? 'danger' : 'success'} size="sm">{u.banned ? t('badge.banned') : t('badge.active')}</Badge>
                    <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{formatDateShort(u.createdAt)}</span>
                    <RowMenu
                      items={[
                        { label: t('actions.impersonate'), icon: LogIn, disabled: busyId !== null || u.role === 'admin', onClick: () => { setImpersonateFor(u); } },
                        u.role === 'admin'
                          ? { label: t('actions.demote'), icon: ShieldMinus, disabled: busyId !== null, onClick: () => { void doSetRole(u); } }
                          : { label: t('actions.promote'), icon: ShieldCheck, disabled: busyId !== null, onClick: () => { void doSetRole(u); } },
                        u.banned
                          ? { label: t('actions.unban'), icon: ShieldCheck, disabled: busyId !== null, onClick: () => { void doUnban(u); } }
                          : { label: t('actions.ban'), icon: Ban, danger: true, disabled: busyId !== null || u.role === 'admin', onClick: () => { setBanFor(u); } },
                      ]}
                    />
                  </>
                )}
              />
              {usersPage.cursor && <div className="flex justify-center"><Button variant="ghost" size="md" disabled={usersPage.loadingMore} onClick={usersPage.loadMore}>{t('actions.loadMore')}</Button></div>}
            </section>

            {/* Orgs */}
            <section id="orgs" className="flex flex-col gap-3">
              <h2 className="text-base font-semibold inline-flex items-center gap-2" style={{ color: 'var(--fg-strong)' }}>
                <Building2 className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} /> {t('sections.orgs')}
              </h2>
              <DataTable<AdminOrg>
                columns="1fr 160px 120px 120px 44px"
                headers={[{ header: t('cols.organization') }, { header: t('cols.slug') }, { header: t('cols.plan') }, { header: t('cols.created') }, { header: '' }]}
                rows={orgs}
                rowKey={(o) => o.id}
                empty={<EmptyState title={t('empty.orgsTitle')} subtitle={t('empty.orgsSubtitle')} />}
                renderRow={(o) => (
                  <>
                    <span className="text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{o.name}</span>
                    <span className="text-sm truncate font-mono" style={{ color: 'var(--fg-muted)' }}>{o.slug}</span>
                    <Badge variant={planVariant(o.plan)} size="sm">{o.plan}</Badge>
                    <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{formatDateShort(o.createdAt)}</span>
                    <RowMenu items={[{ label: t('actions.overridePlan'), icon: CreditCard, disabled: busyId !== null, onClick: () => { setPlanFor(o); } }]} />
                  </>
                )}
              />
              {orgsPage.cursor && <div className="flex justify-center"><Button variant="ghost" size="md" disabled={orgsPage.loadingMore} onClick={orgsPage.loadMore}>{t('actions.loadMore')}</Button></div>}
            </section>

            {/* Domain force-release — free a domain squatted by a defunct org
                across both registries (org-domain + SSO). Idempotent server-side. */}
            <section id="domains" className="flex flex-col gap-3">
              <h2 className="text-base font-semibold inline-flex items-center gap-2" style={{ color: 'var(--fg-strong)' }}>
                <Globe className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} /> {t('sections.domains')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('domains.body')}</p>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); void doReleaseDomain(); }}
              >
                <input
                  value={domainInput}
                  onChange={(e) => { setDomainInput(e.target.value); setDomainResult(null); }}
                  placeholder={t('domains.placeholder')}
                  aria-label={t('domains.placeholder')}
                  className="w-72 h-9 rounded-md px-3 text-base outline-none"
                  style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
                />
                <Button type="submit" variant="primary" size="md" disabled={domainBusy || domainInput.trim() === ''}>
                  {domainBusy ? t('domains.releasing') : t('domains.release')}
                </Button>
              </form>
              {domainResult && (
                <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                  <Badge variant={domainResult.orgDomainReleased ? 'success' : 'neutral'} size="sm">
                    {domainResult.orgDomainReleased ? t('domains.orgReleased') : t('domains.orgNone')}
                  </Badge>
                  <Badge variant={domainResult.ssoReleased ? 'success' : 'neutral'} size="sm">
                    {domainResult.ssoReleased ? t('domains.ssoReleased') : t('domains.ssoNone')}
                  </Badge>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {banFor && <BanModal user={banFor} busy={busyId === banFor.id} onClose={() => { setBanFor(null); }} onConfirm={(r) => { void doBan(r); }} />}
      {planFor && <PlanModal org={planFor} busy={busyId === planFor.id} onClose={() => { setPlanFor(null); }} onConfirm={(p, r) => { void doOverridePlan(p, r); }} />}
      {impersonateFor && (
        <ConfirmDialog
          open
          danger={false}
          busy={busyId === impersonateFor.id}
          icon={<UserCog className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
          onCancel={() => { setImpersonateFor(null); }}
          onConfirm={() => { void doImpersonate(); }}
          title={t('impersonateDialog.title', { email: impersonateFor.email })}
          confirmLabel={t('impersonateDialog.confirm')}
          description={t('impersonateDialog.description')}
        />
      )}
    </AdminShell>
  );
}

function BanModal({ user, busy, onClose, onConfirm }: { user: AdminUser; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  return (
    <SettingsModal
      open onClose={onClose} size="sm"
      icon={<Ban className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />}
      title={t('ban.title', { name: user.email })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button variant="danger" size="md" disabled={busy} onClick={() => { onConfirm(reason); }}>{busy ? t('ban.confirming') : t('ban.confirm')}</Button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('ban.body')}</p>
      <Field label={t('ban.reasonLabel')} value={reason} onChange={(e) => { setReason(e.target.value.slice(0, 500)); }} placeholder={t('ban.reasonPlaceholder')} autoFocus />
    </SettingsModal>
  );
}

function PlanModal({ org, busy, onClose, onConfirm }: { org: AdminOrg; busy: boolean; onClose: () => void; onConfirm: (plan: AdminPlan, reason: string) => void }) {
  const { t } = useTranslation('admin');
  const [plan, setPlan] = useState<AdminPlan>((PLANS.includes(org.plan as AdminPlan) ? org.plan : 'free') as AdminPlan);
  const [reason, setReason] = useState('');
  return (
    <SettingsModal
      open onClose={onClose} size="sm"
      icon={<CreditCard className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('plan.title', { name: org.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button variant="primary" size="md" disabled={busy} onClick={() => { onConfirm(plan, reason); }}>{busy ? t('plan.confirming') : t('plan.confirm')}</Button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('plan.body')}</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>{t('plan.planLabel')}</span>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value as AdminPlan); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <Field label={t('plan.reasonLabel')} value={reason} onChange={(e) => { setReason(e.target.value.slice(0, 500)); }} placeholder={t('plan.reasonPlaceholder')} />
    </SettingsModal>
  );
}
