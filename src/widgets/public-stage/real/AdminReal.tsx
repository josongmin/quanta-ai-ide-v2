import { useEffect, useRef, useState } from 'react';
import { UserCog, Ban, ShieldCheck, LogIn, CreditCard, Building2, Users } from 'lucide-react';
import { AdminShell } from '../parts/AdminShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, Badge, EmptyState, InlineError, SkeletonText,
  SettingsModal, ConfirmDialog, type BadgeVariant,
} from '@shared/ui';
import {
  listUsers, banUser, unbanUser, impersonateUser,
  listOrgs, overridePlan,
  type AdminUser, type AdminOrg, type AdminPlan,
} from '@entities/admin';

// Real platform super-admin backoffice over accounts /v1/admin/*. Honest to the
// backend: user directory + moderation (ban/impersonate) and org directory +
// plan override. (The mock's jobs/flags/data-tools are product surfaces, not
// backed here.) House rules: no edge stripes, no grey selected-fills, intent
// tokens, named font-size classes.
const PLANS: AdminPlan[] = ['free', 'team', 'business', 'enterprise'];
const NO_USERS: AdminUser[] = [];
const NO_ORGS: AdminOrg[] = [];

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
const planVariant = (p: string): BadgeVariant => (p === 'business' || p === 'enterprise' ? 'success' : 'neutral');

export function AdminReal() {
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [users, setUsers] = useState<AdminUser[]>(NO_USERS);
  const [orgs, setOrgs] = useState<AdminOrg[]>(NO_ORGS);
  const [userCursor, setUserCursor] = useState<string | null>(null);
  const [orgCursor, setOrgCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  // moderation modals
  const [banFor, setBanFor] = useState<AdminUser | null>(null);
  const [impersonateFor, setImpersonateFor] = useState<AdminUser | null>(null);
  const [planFor, setPlanFor] = useState<AdminOrg | null>(null);

  // 유저는 검색어에 반응. orgs와 분리해 검색 타이핑이 org 페이지네이션을 리셋하지 않게.
  useEffect(() => {
    let active = true;
    void listUsers({ search }).then((u) => {
      if (!active) return;
      if (u.ok) { setUsers(u.data.users); setUserCursor(u.data.nextCursor); setError(null); } else setError(u.error);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, nonce]);

  // orgs는 검색과 무관 — nonce(명시 refetch)에만 반응.
  useEffect(() => {
    let active = true;
    void listOrgs().then((o) => {
      if (!active) return;
      if (o.ok) { setOrgs(o.data.orgs); setOrgCursor(o.data.nextCursor); } else setError(o.error);
    });
    return () => { active = false; };
  }, [nonce]);

  const refetch = () => { setNonce((n) => n + 1); };

  async function loadMoreUsers() {
    if (!userCursor) return;
    const res = await listUsers({ search, cursor: userCursor });
    if (!mountedRef.current) return;
    if (!res.ok) { setError(res.error); return; }
    setUsers((p) => [...p, ...res.data.users]); setUserCursor(res.data.nextCursor);
  }
  async function loadMoreOrgs() {
    if (!orgCursor) return;
    const res = await listOrgs({ cursor: orgCursor });
    if (!mountedRef.current) return;
    if (!res.ok) { setError(res.error); return; }
    setOrgs((p) => [...p, ...res.data.orgs]); setOrgCursor(res.data.nextCursor);
  }

  async function doUnban(u: AdminUser) {
    if (busyId) return;
    setBusyId(u.id);
    const res = await unbanUser(u.id);
    if (!mountedRef.current) return;
    setBusyId(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }
  async function doBan(reason: string) {
    if (!banFor) return;
    setBusyId(banFor.id);
    const res = await banUser(banFor.id, reason.trim() || null);
    if (!mountedRef.current) return;
    setBusyId(null); setBanFor(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }
  async function doImpersonate() {
    if (!impersonateFor) return;
    setBusyId(impersonateFor.id);
    const res = await impersonateUser(impersonateFor.id);
    if (!mountedRef.current) return;
    setBusyId(null); setImpersonateFor(null);
    if (!res.ok) { setError(res.error); return; }
    // 세션 쿠키가 대상 유저로 스왑됨 → 그 유저 뷰로 진입.
    window.location.href = '/intelligence';
  }
  async function doOverridePlan(plan: AdminPlan, reason: string) {
    if (!planFor) return;
    setBusyId(planFor.id);
    const res = await overridePlan(planFor.id, plan, reason.trim() || null);
    if (!mountedRef.current) return;
    setBusyId(null); setPlanFor(null);
    if (!res.ok) { setError(res.error); return; }
    refetch();
  }

  return (
    <AdminShell active="overview">
      <div className="px-6 py-6 flex flex-col gap-8 max-w-[1100px] mx-auto w-full">
        <header>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg-strong)' }}>Super-admin</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Platform operator tools — every action is audited. Impersonation is visible to the target org.</p>
        </header>

        {error && <InlineError message={error} onRetry={() => { setError(null); refetch(); }} />}

        {loading ? (
          <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}><SkeletonText lines={8} /></div>
        ) : (
          <>
            {/* Users */}
            <section id="users" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold inline-flex items-center gap-2" style={{ color: 'var(--fg-strong)' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} /> Users
                </h2>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); }}
                  placeholder="Search email or name…"
                  aria-label="Search users by email or name"
                  className="w-64 h-9 rounded-md px-3 text-base outline-none"
                  style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
                />
              </div>
              <DataTable<AdminUser>
                columns="1fr 120px 110px 120px 44px"
                headers={[{ header: 'User' }, { header: 'Role' }, { header: 'Status' }, { header: 'Joined' }, { header: '' }]}
                rows={users}
                rowKey={(u) => u.id}
                empty={<EmptyState title="No users" subtitle="No users match your search." />}
                renderRow={(u) => (
                  <>
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{u.name ?? '—'}</span>
                      <span className="text-2xs truncate font-mono" style={{ color: 'var(--fg-subtle)' }}>{u.email}</span>
                    </span>
                    {u.role === 'admin' ? <Badge variant="info" size="sm">Admin</Badge> : <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>Member</span>}
                    <Badge variant={u.banned ? 'danger' : 'success'} size="sm">{u.banned ? 'Banned' : 'Active'}</Badge>
                    <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(u.createdAt)}</span>
                    <RowMenu
                      items={[
                        { label: 'Impersonate', icon: LogIn, disabled: busyId !== null || u.role === 'admin', onClick: () => { setImpersonateFor(u); } },
                        u.banned
                          ? { label: 'Unban', icon: ShieldCheck, disabled: busyId !== null, onClick: () => { void doUnban(u); } }
                          : { label: 'Ban', icon: Ban, danger: true, disabled: busyId !== null || u.role === 'admin', onClick: () => { setBanFor(u); } },
                      ]}
                    />
                  </>
                )}
              />
              {userCursor && <div className="flex justify-center"><Button variant="ghost" size="md" onClick={() => { void loadMoreUsers(); }}>Load more</Button></div>}
            </section>

            {/* Orgs */}
            <section id="orgs" className="flex flex-col gap-3">
              <h2 className="text-base font-semibold inline-flex items-center gap-2" style={{ color: 'var(--fg-strong)' }}>
                <Building2 className="w-4 h-4" style={{ color: 'var(--fg-muted)' }} /> Organizations
              </h2>
              <DataTable<AdminOrg>
                columns="1fr 160px 120px 120px 44px"
                headers={[{ header: 'Organization' }, { header: 'Slug' }, { header: 'Plan' }, { header: 'Created' }, { header: '' }]}
                rows={orgs}
                rowKey={(o) => o.id}
                empty={<EmptyState title="No organizations" subtitle="Nothing here yet." />}
                renderRow={(o) => (
                  <>
                    <span className="text-sm truncate" style={{ color: 'var(--fg-strong)' }}>{o.name}</span>
                    <span className="text-sm truncate font-mono" style={{ color: 'var(--fg-muted)' }}>{o.slug}</span>
                    <Badge variant={planVariant(o.plan)} size="sm">{o.plan}</Badge>
                    <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(o.createdAt)}</span>
                    <RowMenu items={[{ label: 'Override plan', icon: CreditCard, disabled: busyId !== null, onClick: () => { setPlanFor(o); } }]} />
                  </>
                )}
              />
              {orgCursor && <div className="flex justify-center"><Button variant="ghost" size="md" onClick={() => { void loadMoreOrgs(); }}>Load more</Button></div>}
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
          title={`Impersonate ${impersonateFor.email}?`}
          confirmLabel="Impersonate"
          description="You'll act as this user until you stop. The action is audited and visible to their org."
        />
      )}
    </AdminShell>
  );
}

function BanModal({ user, busy, onClose, onConfirm }: { user: AdminUser; busy: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <SettingsModal
      open onClose={onClose} size="sm"
      icon={<Ban className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />}
      title={`Ban ${user.email}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" size="md" disabled={busy} onClick={() => { onConfirm(reason); }}>{busy ? 'Banning…' : 'Ban user'}</Button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Their sessions are revoked immediately. They can be unbanned later.</p>
      <Field label="Reason (optional)" value={reason} onChange={(e) => { setReason(e.target.value.slice(0, 500)); }} placeholder="Spam / abuse / support request" autoFocus />
    </SettingsModal>
  );
}

function PlanModal({ org, busy, onClose, onConfirm }: { org: AdminOrg; busy: boolean; onClose: () => void; onConfirm: (plan: AdminPlan, reason: string) => void }) {
  const [plan, setPlan] = useState<AdminPlan>((PLANS.includes(org.plan as AdminPlan) ? org.plan : 'free') as AdminPlan);
  const [reason, setReason] = useState('');
  return (
    <SettingsModal
      open onClose={onClose} size="sm"
      icon={<CreditCard className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={`Override plan — ${org.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" disabled={busy} onClick={() => { onConfirm(plan, reason); }}>{busy ? 'Applying…' : 'Apply override'}</Button>
        </>
      }
    >
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Sets the plan directly (bypasses Stripe) and refreshes entitlements. The org owner is notified.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>Plan</span>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value as AdminPlan); }}
          className="h-9 rounded-md px-2.5 text-base outline-none cursor-pointer"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
        >
          {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>
      <Field label="Reason (optional)" value={reason} onChange={(e) => { setReason(e.target.value.slice(0, 500)); }} placeholder="Design partner / support credit" />
    </SettingsModal>
  );
}
