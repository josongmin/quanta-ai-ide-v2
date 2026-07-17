import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { OrgShell } from '../../../parts/OrgShell';
import { Section, Row, Field, Button, SaveBar } from '@shared/ui/forms';
import { ConfirmDialog, InlineError, SkeletonText } from '@shared/ui';
import { useOrg, updateOrg, deleteOrg } from '@entities/org';

// Real org identity: name + URL slug (better-auth first-class fields) and org
// deletion. The mock's logo upload, website, description, and default-workspace
// aren't backend-backed (logo needs object storage; workspace is a product/intel
// concept), so they're dropped rather than faked.
export function GeneralReal() {
  const { org = '' } = useParams({ strict: false });
  const navigate = useNavigate();
  const { detail, isPending, error, refetch } = useOrg(org);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Seed the editable form ONCE per loaded org — not on every `detail` identity
  // change, so a post-save refetch (or background refresh) can't clobber edits
  // the user has since typed.
  const seededOrgId = useRef<string | null>(null);
  useEffect(() => {
    if (!detail || seededOrgId.current === detail.org.id) return;
    seededOrgId.current = detail.org.id;
    setName(detail.org.name);
    setSlug(detail.org.slug);
  }, [detail]);

  const orgId = detail?.org.id ?? '';
  const dirty = Boolean(detail) && (name !== detail?.org.name || slug !== detail?.org.slug);

  async function save() {
    if (!orgId) return;
    setSaving('saving');
    setActionError(null);
    const res = await updateOrg({ organizationId: orgId, data: { name, slug } });
    if (!res.ok) { setSaving('idle'); setActionError(res.error); return; }
    setSaving('saved');
    refetch();
    setTimeout(() => { setSaving('idle'); }, 1200);
  }

  async function doDelete() {
    if (!orgId) return;
    setConfirmDelete(false);
    setActionError(null);
    const res = await deleteOrg({ organizationId: orgId });
    if (!res.ok) { setActionError(res.error); return; }
    void navigate({ to: '/' });
  }

  if (error) {
    return (
      <OrgShell orgName={org} orgSlug={org} title="General" subtitle="Identity for this organization.">
        <InlineError message={error} onRetry={refetch} />
      </OrgShell>
    );
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title="General"
      subtitle="Identity for this organization."
    >
      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={() => { setActionError(null); }} />
        </div>
      )}

      {isPending ? (
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      ) : (
        <>
          <Section title="Identity" hint="How this org appears across the product and to invitees.">
            <Field
              label="Display name"
              hint="up to 40 chars"
              value={name}
              onChange={(e) => { setName(e.target.value.slice(0, 40)); }}
              maxLength={40}
            />
            <Field
              label="URL slug"
              hint="se-field.app/{slug}"
              value={slug}
              onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
            />
          </Section>

          <Section title="Danger zone" hint="Irreversible actions affecting this entire organization.">
            <Row
              label="Delete organization"
              sub="Permanently remove this org, its workspaces, and all attached data. People keep their accounts."
              danger
            >
              <Button variant="danger" leading={<Trash2 className="w-3 h-3" />} onClick={() => { setConfirmDelete(true); }}>
                Delete org
              </Button>
            </Row>
          </Section>

          <SaveBar
            visible={dirty || saving !== 'idle'}
            dirty={dirty}
            savingState={saving}
            onSave={() => { void save(); }}
            onDiscard={() => { if (detail) { setName(detail.org.name); setSlug(detail.org.slug); } }}
          />

          <ConfirmDialog
            open={confirmDelete}
            onCancel={() => { setConfirmDelete(false); }}
            onConfirm={() => { void doDelete(); }}
            title={`Delete ${detail?.org.name ?? 'organization'}?`}
            confirmLabel="I understand, delete"
            width={460}
            requireTypedConfirmation={detail?.org.name ?? ''}
            description={
              <>
                This permanently deletes the organization, every workspace inside it, billing records, and all
                agent history. People keep their accounts but lose access. Type{' '}
                <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{detail?.org.name}</span> below to confirm.
              </>
            }
          />
        </>
      )}
    </OrgShell>
  );
}
