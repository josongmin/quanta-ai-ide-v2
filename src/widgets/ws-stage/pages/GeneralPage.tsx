import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WsShell } from '../parts/WsShell';
import { Section, Row, Field, Toggle, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

type Form = {
  name: string;
  slug: string;
  defaultBranch: 'main' | 'develop' | 'release';
  description: string;
  archived: boolean;
};

const BRANCHES: Form['defaultBranch'][] = ['main', 'develop', 'release'];

export default function GeneralPage() {
  const { t } = useTranslation('ws');
  const INITIAL = useMemo<Form>(() => ({
    name: 'monorepo',
    slug: 'monorepo',
    defaultBranch: 'main',
    description: t('general.descriptionDefault'),
    archived: false,
  }), [t]);
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');

  const dirty = !shallowEqual(form, INITIAL);

  const save = () => {
    setSaving('saving');
    setTimeout(() => {
      setSaving('saved');
      setTimeout(() => { setSaving('idle'); }, 1200);
    }, 600);
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title={t('general.title')}
      subtitle={t('general.subtitle')}
    >
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
            onChange={(e) => { set('defaultBranch', e.target.value as Form['defaultBranch']); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 160,
            }}
          >
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
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
        onSave={save}
        onDiscard={() => { setForm(INITIAL); }}
      />
    </WsShell>
  );
}
