import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Mail, Plus, RotateCcw, X } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button } from '@shared/ui/forms';
import {
  DataTable, RowMenu, Badge, EmptyState, InlineError, SkeletonText,
} from '@shared/ui';
import {
  useOrg, cancelInvitation, resendInvitation,
  type OrgInvitation,
} from '@entities/org';
import { ROLE_LABEL, expiresLabel } from '../../../parts/format';
import { RealInviteModal } from '../members/RealInviteModal';

// Real pending-invitation list over the org plugin. The mock's sent-by / team /
// accepted-history columns are dropped: better-auth's invitation record exposes
// email, role, status, and expiry, and only pending invites are actionable.
export function InvitationsReal() {
  const { org = '' } = useParams({ strict: false });
  const { detail, isPending, error, refetch } = useOrg(org);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const invitations = detail?.invitations ?? [];
  const orgId = detail?.org.id ?? '';

  async function revoke(inv: OrgInvitation) {
    setBusyId(inv.id);
    setActionError(null);
    const res = await cancelInvitation({ invitationId: inv.id });
    setBusyId(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  async function resend(inv: OrgInvitation) {
    setBusyId(inv.id);
    setActionError(null);
    const res = await resendInvitation({ organizationId: orgId, email: inv.email, role: inv.role });
    setBusyId(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="Invitations"
      subtitle="Outstanding invites for this organization. Resend or revoke a pending invite."
      topRight={
        <Button
          variant="primary"
          size="md"
          leading={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setInviteOpen(true); }}
          disabled={!orgId}
        >
          Invite people
        </Button>
      }
    >
      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={() => { setActionError(null); }} />
        </div>
      )}

      {error ? (
        <InlineError message={error} onRetry={refetch} />
      ) : isPending ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      ) : (
        <DataTable<OrgInvitation>
          columns="1fr 120px 120px 44px"
          headers={[{ header: 'Email' }, { header: 'Role' }, { header: 'Expires' }, { header: '' }]}
          rows={invitations}
          rowKey={(inv) => inv.id}
          empty={
            <EmptyState
              title="No pending invitations"
              subtitle="Invite people by email to see them here."
            />
          }
          renderRow={(inv) => {
            const rowBusy = busyId === inv.id;
            return (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                  <span className="text-base truncate" style={{ color: 'var(--fg-strong)' }}>{inv.email}</span>
                </div>
                <Badge variant="neutral" size="sm">{ROLE_LABEL[inv.role]}</Badge>
                <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                  {expiresLabel(inv.expiresAt)}
                </span>
                <RowMenu
                  items={[
                    { label: 'Resend invite', icon: RotateCcw, disabled: rowBusy, onClick: () => { void resend(inv); } },
                    { label: 'Revoke invite', icon: X, danger: true, disabled: rowBusy, onClick: () => { void revoke(inv); } },
                  ]}
                />
              </>
            );
          }}
        />
      )}

      {!error && !isPending && (
        <p className="text-sm mt-3 px-1" style={{ color: 'var(--fg-subtle)' }}>
          {invitations.length} pending {invitations.length === 1 ? 'invite' : 'invites'}.
        </p>
      )}

      {inviteOpen && orgId && (
        <RealInviteModal
          organizationId={orgId}
          onClose={() => { setInviteOpen(false); }}
          onInvited={refetch}
        />
      )}
    </OrgShell>
  );
}
