import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Field, Toggle, SaveBar } from '@shared/ui/forms';
import { InlineError, SkeletonText } from '@shared/ui';
import { SettingsContractNotice } from '../parts/SettingsContractNotice';
import { useWorkspaceRouteParams } from '../lib/useWorkspaceRouteParams';
import { useWorkspaceSettingsForm } from '../lib/useWorkspaceSettingsForm';

type Form = {
  name: string;
  slug: string;
  defaultBranch: string;
  description: string;
  archived: boolean;
};

const BRANCHES = ['main', 'develop', 'release'];

export default function GeneralPage() {
  const { t } = useTranslation('ws');
  const { wsSlug } = useWorkspaceRouteParams();
  const initial = useMemo<Form>(() => ({
    name: wsSlug,
    slug: wsSlug,
    defaultBranch: 'main',
    description: t('general.descriptionDefault'),
    archived: false,
  }), [t, wsSlug]);
  const {
    actionError,
    clearActionError,
    detail,
    dirty,
    discard,
    form,
    isPending,
    isReal,
    loadError,
    retryLoad,
    save,
    saveBlockedReason,
    saving,
    setForm,
    shell,
  } = useWorkspaceSettingsForm<Form>({
    initial,
    // Supported by default (the documented PATCH /v1/workspaces/{id}); the hook
    // still blocks the write at runtime if the collection route 404s (service
    // not deployed), reusing this message for the notice.
    realSaveMessage: t('settingsContract.body', { surface: t('general.title') }),
    fromDetail: (workspace) => ({
      ...initial,
      name: workspace.name ?? initial.name,
      slug: workspace.slug ?? initial.slug,
      defaultBranch: workspace.defaultBranch ?? initial.defaultBranch,
      description: workspace.description ?? initial.description,
      archived: workspace.archived ?? initial.archived,
    }),
    toPatch: (next) => ({
      name: next.name,
      slug: next.slug,
      default_branch: next.defaultBranch,
      description: next.description,
      archived: next.archived,
    }),
  });
  const branches = useMemo(
    () => Array.from(new Set(form.defaultBranch ? [...BRANCHES, form.defaultBranch] : BRANCHES)),
    [form.defaultBranch],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  if (isReal && loadError) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('general.title')}
        subtitle={t('general.subtitle')}
      >
        <InlineError message={loadError} onRetry={retryLoad} />
      </WsShell>
    );
  }

  if (isReal && isPending && !detail) {
    return (
      <WsShell
        orgName={shell.orgName}
        orgSlug={shell.orgSlug}
        wsName={shell.wsName}
        wsSlug={shell.wsSlug}
        title={t('general.title')}
        subtitle={t('general.subtitle')}
      >
        <div className="rounded-md p-4" style={{ border: '1px solid var(--border-muted)' }}>
          <SkeletonText lines={4} />
        </div>
      </WsShell>
    );
  }

  return (
    <WsShell
      orgName={shell.orgName}
      orgSlug={shell.orgSlug}
      wsName={shell.wsName}
      wsSlug={shell.wsSlug}
      title={t('general.title')}
      subtitle={t('general.subtitle')}
    >
      {isReal && saveBlockedReason && (
        <div className="mb-3">
          <SettingsContractNotice title={t('settingsContract.title')} message={saveBlockedReason} />
        </div>
      )}

      {actionError && (
        <div className="mb-3">
          <InlineError message={actionError} onRetry={clearActionError} />
        </div>
      )}

      <Section title={t('general.identity.title')} hint={t('general.identity.hint')}>
        <Field
          label={t('general.displayName.label')}
          hint={t('general.displayName.hint')}
          value={form.name}
          onChange={(e) => { set('name', e.target.value.slice(0, 40)); }}
          maxLength={40}
        />

        <Field
          label={t('general.urlSlug.label')}
          hint={t('general.urlSlug.hint')}
          value={form.slug}
          onChange={(e) => { set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
        />

        <Field
          label={t('general.description.label')}
          hint={t('general.description.hint')}
          value={form.description}
          onChange={(e) => { set('description', e.target.value); }}
        />
      </Section>

      <Section title={t('general.defaults.title')} hint={t('general.defaults.hint')}>
        <Row label={t('general.defaultBranch.label')} sub={t('general.defaultBranch.sub')}>
          <select
            value={form.defaultBranch}
            onChange={(e) => { set('defaultBranch', e.target.value); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 160,
            }}
          >
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Row>
      </Section>

      <Section title={t('general.lifecycle.title')} hint={t('general.lifecycle.hint')}>
        <Row
          label={t('general.archived.label')}
          sub={t('general.archived.sub')}
        >
          <Toggle checked={form.archived} onChange={(v) => { set('archived', v); }} label={t('general.archived.toggle')} />
        </Row>
      </Section>

      <SaveBar
        visible={dirty || saving !== 'idle'}
        dirty={dirty}
        savingState={saving}
        onSave={() => { void save(); }}
        onDiscard={discard}
        saveDisabled={Boolean(saveBlockedReason)}
        saveDisabledTitle={saveBlockedReason ?? undefined}
      />
    </WsShell>
  );
}
