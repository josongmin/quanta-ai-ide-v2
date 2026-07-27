import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('org');
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
      <OrgShell orgName={org} orgSlug={org} title={t('general.title')} subtitle={t('general.subtitleReal')}>
        <InlineError message={error} onRetry={refetch} />
      </OrgShell>
    );
  }

  return (
    <OrgShell
      orgName={detail?.org.name ?? org}
      orgSlug={detail?.org.slug ?? org}
      title={t('general.title')}
      subtitle={t('general.subtitleReal')}
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
          <Section title={t('general.identity.title')} hint={t('general.identity.hint')}>
            <Field
              label={t('general.identity.displayName')}
              hint={t('general.identity.displayNameHint')}
              value={name}
              onChange={(e) => { setName(e.target.value.slice(0, 40)); }}
              maxLength={40}
            />
            <Field
              label={t('general.identity.slug')}
              hint={t('general.identity.slugHintReal')}
              value={slug}
              onChange={(e) => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
            />
          </Section>

          <Section title={t('general.danger.title')} hint={t('general.danger.hint')}>
            <Row
              label={t('general.danger.deleteLabel')}
              sub={t('general.danger.deleteSub')}
              danger
            >
              <Button variant="danger" leading={<Trash2 className="w-3 h-3" />} onClick={() => { setConfirmDelete(true); }}>
                {t('general.danger.deleteButton')}
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
            title={detail?.org.name ? t('general.deleteDialog.title', { name: detail.org.name }) : t('general.deleteDialog.titleFallback')}
            confirmLabel={t('general.deleteDialog.confirm')}
            width={460}
            requireTypedConfirmation={detail?.org.name ?? ''}
            description={
              <>
                {t('general.deleteDialog.descriptionPre')}
                <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{detail?.org.name}</span>{t('general.deleteDialog.descriptionPost')}
              </>
            }
          />
        </>
      )}
    </OrgShell>
  );
}
