import { useState } from 'react';
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

const INITIAL: Form = {
  name: 'monorepo',
  slug: 'monorepo',
  defaultBranch: 'main',
  description: 'Primary application and shared packages.',
  archived: false,
};

const BRANCHES: Form['defaultBranch'][] = ['main', 'develop', 'release'];

export default function GeneralPage() {
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
      title="General"
      subtitle="Identity and defaults for this workspace."
    >
      <Section title="Identity" hint="How this workspace appears across the product.">
        <Field
          label="Display name"
          hint="up to 40 chars"
          value={form.name}
          onChange={(e) => { set('name', e.target.value.slice(0, 40)); }}
          maxLength={40}
        />

        <Field
          label="URL slug"
          hint="acme.app/acme/{slug}"
          value={form.slug}
          onChange={(e) => { set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
        />

        <Field
          label="Description"
          hint="shown on the workspace dashboard"
          value={form.description}
          onChange={(e) => { set('description', e.target.value); }}
        />
      </Section>

      <Section title="Defaults" hint="Per-workspace fallbacks for new branches and PRs.">
        <Row label="Default branch" sub="The branch new PRs target by default.">
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

      <Section title="Lifecycle" hint="Hide this workspace without deleting any data.">
        <Row
          label="Archived"
          sub="Archived workspaces are read-only and hidden from default views. You can restore at any time."
        >
          <Toggle checked={form.archived} onChange={(v) => { set('archived', v); }} label="Archive workspace" />
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
