import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { UserPlus, UserMinus } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import {
  ConfirmDialog, SearchInput, EmptyState, DataTable, RowMenu, Badge,
  InlineError, SkeletonText,
} from '@shared/ui';
import { useSession } from '@entities/session';
import {
  useOrg, removeMember, updateMemberRole,
  type OrgMember, type OrgRole,
} from '@entities/org';
import { roleLabel, ASSIGNABLE_ROLES, initials, shortDate } from '../../../parts/format';
import { RealInviteModal } from './RealInviteModal';

// Real member roster over better-auth's org plugin. Intentionally leaner than
// the mock: the backend has no per-member team label, last-active, 2FA flag, or
// "deactivated" status (removal is the only offboarding), so those columns are
// dropped rather than faked. Invitations live on the Invitations page.

// Stable empty reference so `detail?.members ?? EMPTY` doesn't change the
// useMemo deps every render while the org is still loading.
const EMPTY_MEMBERS: OrgMember[] = [];

export function MembersReal() {
  const { t } = useTranslation('org');
  // Route is always /org/$org/* so `org` (the slug) is present.
  const { org = '' } = useParams({ strict: false });
  const { detail, isPending, error, refetch } = useOrg(org);
  const { user } = useSession();

  const [q, setQ] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<OrgMember | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const members = detail?.members ?? EMPTY_MEMBERS;
  const orgId = detail?.org.id ?? '';

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle),
    );
  }, [members, q]);

  async function changeRole(m: OrgMember, role: OrgRole) {
    setBusyId(m.id);
    setActionError(null);
    const res = await updateMemberRole({ organizationId: orgId, memberId: m.id, role });
    setBusyId(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  async function doRemove(m: OrgMember) {
    setBusyId(m.id);
    setActionError(null);
    const res = await removeMember({ organizationId: orgId, memberIdOrEmail: m.id });
    setBusyId(null);
    setConfirmRemove(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('members.title')}
      subtitle={t('members.subtitleReal')}
      topRight={
        <Button
          variant="primary"
          size="md"
          leading={<UserPlus className="w-3.5 h-3.5" />}
          onClick={() => { setInviteOpen(true); }}
          disabled={!orgId}
        >
          {t('members.invitePeople')}
        </Button>
      }
    >
      <div className="flex items-center justify-end mb-3">
        <SearchInput value={q} onChange={setQ} placeholder={t('members.searchPlaceholderReal')} minWidth={220} />
      </div>

      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={() => { setActionError(null); }} />
        </div>
      )}

      {error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : isPending ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={5} />
        </div>
      ) : (
        <DataTable<OrgMember>
          columns="1fr 150px 130px 44px"
          headers={[{ header: t('members.table.member') }, { header: t('members.table.role') }, { header: t('members.table.joined') }, { header: '' }]}
          rows={filtered}
          rowKey={(m) => m.id}
          empty={
            <EmptyState
              title={q ? t('members.empty.noMatchesTitle', { query: q }) : t('members.empty.noMembersTitle')}
              subtitle={q ? t('members.empty.noMatchesKeyword') : t('members.empty.noMembersSubtitle')}
            />
          }
          renderRow={(m) => {
            const isSelf = m.userId === user?.id;
            const isOwner = m.role === 'owner';
            const rowBusy = busyId === m.id;
            return (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-2xs font-bold shrink-0"
                    style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}
                  >
                    {initials(m.name, m.email)}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-base truncate flex items-center gap-1.5" style={{ color: 'var(--fg-strong)' }}>
                      {m.name || m.email}
                      {isSelf && <Badge variant="info" size="sm">{t('members.you')}</Badge>}
                    </span>
                    <span className="text-sm truncate" style={{ color: 'var(--fg-subtle)' }}>{m.email}</span>
                  </span>
                </div>

                {isOwner ? (
                  <Badge variant="neutral" size="sm">{t('common.role.owner')}</Badge>
                ) : (
                  <select
                    value={m.role}
                    disabled={rowBusy}
                    onChange={(e) => { void changeRole(m, e.target.value as OrgRole); }}
                    className="h-8 rounded-md px-2 text-sm outline-none cursor-pointer"
                    style={{
                      background: 'var(--bg-surface-muted)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--fg-strong)',
                    }}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{roleLabel(t, r)}</option>
                    ))}
                  </select>
                )}

                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                  {shortDate(m.createdAt)}
                </span>

                <RowMenu
                  items={[
                    {
                      label: t('members.rowMenu.removeFromOrganization'),
                      icon: UserMinus,
                      danger: true,
                      disabled: isOwner || isSelf || rowBusy,
                      onClick: () => { setConfirmRemove(m); },
                    },
                  ]}
                />
              </>
            );
          }}
        />
      )}

      {!error && !isPending && (
        <p className="text-sm mt-3 px-1" style={{ color: 'var(--fg-subtle)' }}>
          {t('members.footerReal', { count: members.length, filtered: filtered.length, total: members.length })}
        </p>
      )}

      {inviteOpen && orgId && (
        <RealInviteModal
          organizationId={orgId}
          onClose={() => { setInviteOpen(false); }}
          onInvited={refetch}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { void doRemove(confirmRemove); }}
          title={t('members.removeDialog.title', { name: confirmRemove.name || confirmRemove.email })}
          confirmLabel={t('members.removeDialog.confirm')}
          description={t('members.removeDialog.description')}
        />
      )}
    </OrgShell>
  );
}
