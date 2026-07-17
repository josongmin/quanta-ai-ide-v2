import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { UsersRound, Plus, Trash2 } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Button, Field } from '@shared/ui/forms';
import {
  DataTable, RowMenu, EmptyState, InlineError, SkeletonText, SettingsModal, ConfirmDialog,
} from '@shared/ui';
import { useOrg, createTeam, removeTeam, type OrgTeam } from '@entities/org';
import { shortDate } from '../../../parts/format';

// Real teams over the org plugin — a lean roster (name + created + delete +
// create). The mock's ownership-path routing, notification channels, and team
// membership editor are product/intel concepts the accounts backend doesn't
// model, so they stay mock-only.
export function TeamsReal() {
  const { org = '' } = useParams({ strict: false });
  const { detail, isPending, error, refetch } = useOrg(org);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<OrgTeam | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const teams = detail?.teams ?? [];
  const orgId = detail?.org.id ?? '';

  async function doRemove(t: OrgTeam) {
    setBusyId(t.id);
    setActionError(null);
    const res = await removeTeam({ organizationId: orgId, teamId: t.id });
    setBusyId(null);
    setConfirmRemove(null);
    if (!res.ok) { setActionError(res.error); return; }
    refetch();
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="Teams"
      subtitle="Group people within the organization. Assign ownership and review routing in workspace settings."
      topRight={
        <Button
          variant="primary"
          size="md"
          leading={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setCreateOpen(true); }}
          disabled={!orgId}
        >
          New team
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
        <DataTable<OrgTeam>
          columns="1fr 140px 44px"
          headers={[{ header: 'Team' }, { header: 'Created' }, { header: '' }]}
          rows={teams}
          rowKey={(t) => t.id}
          empty={<EmptyState title="No teams yet" subtitle="Create a team to group members." />}
          renderRow={(t) => (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <UsersRound className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-muted)' }} />
                <span className="text-base font-semibold truncate" style={{ color: 'var(--fg-strong)' }}>{t.name}</span>
              </div>
              <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{shortDate(t.createdAt)}</span>
              <RowMenu
                items={[
                  {
                    label: 'Delete team',
                    icon: Trash2,
                    danger: true,
                    disabled: busyId === t.id,
                    onClick: () => { setConfirmRemove(t); },
                  },
                ]}
              />
            </>
          )}
        />
      )}

      {createOpen && orgId && (
        <CreateTeamReal
          organizationId={orgId}
          onClose={() => { setCreateOpen(false); }}
          onCreated={refetch}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmRemove(null); }}
          onConfirm={() => { void doRemove(confirmRemove); }}
          title={`Delete ${confirmRemove.name}?`}
          confirmLabel="Delete team"
          description="Members stay in the organization; only the team grouping is removed."
        />
      )}
    </OrgShell>
  );
}

function CreateTeamReal({
  organizationId, onClose, onCreated,
}: {
  organizationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const res = await createTeam({ organizationId, name: trimmed });
    setSaving(false);
    if (!res.ok) { setError(res.error); return; }
    onCreated();
    onClose();
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<UsersRound className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title="New team"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" disabled={!name.trim() || saving} onClick={() => { void submit(); }}>
            {saving ? 'Creating…' : 'Create team'}
          </Button>
        </>
      }
    >
      <Field
        label="Team name"
        value={name}
        onChange={(e) => { setName(e.target.value.slice(0, 50)); }}
        maxLength={50}
      />
      {error && (
        <span className="text-sm" style={{ color: 'var(--intent-danger-fg)' }}>{error}</span>
      )}
    </SettingsModal>
  );
}
