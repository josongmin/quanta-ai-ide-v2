import { useState } from 'react';
import { Globe, Trash2 } from 'lucide-react';
import { env } from '@shared/config/env';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Field, Button, SaveBar } from '@shared/ui/forms';
import { ConfirmDialog } from '@shared/ui';
import { shallowEqual } from '@shared/lib';
import { GeneralReal } from './parts/general/GeneralReal';

// Real auth → live org identity (name/slug/delete) over the org plugin;
// otherwise the standalone demo's richer mock form below.
export default function GeneralPage() {
  return env.useRealAuth ? <GeneralReal /> : <GeneralMock />;
}

type Form = {
  name: string;
  slug: string;
  website: string;
  defaultWorkspace: string;
  description: string;
};

const INITIAL: Form = {
  name: 'ACME, Inc.',
  slug: 'acme',
  website: 'https://acme.com',
  defaultWorkspace: 'monorepo',
  description: 'Build software with engineering rigor.',
};

const WORKSPACES = ['monorepo', 'mobile', 'infra', 'docs-site'];

function GeneralMock() {
  const [form, setForm] = useState<Form>(INITIAL);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    <OrgShell
      orgName="ACME, Inc."
      orgSlug="acme"
      title="General"
      subtitle="Identity and defaults for this organization."
    >
      <Section title="Identity" hint="How this org appears across the product and to invitees.">
        <Row label="Logo" sub="Square PNG or SVG, at least 64×64.">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md flex items-center justify-center text-xl font-black"
              style={{
                backgroundImage: 'linear-gradient(to bottom right, var(--fg-accent), var(--fg-link))',
                color: 'var(--bg-canvas)',
              }}
            >
              {form.name.slice(0, 2).toUpperCase()}
            </div>
            <Button>Upload</Button>
            <Button variant="ghost">Remove</Button>
          </div>
        </Row>

        <Field
          label="Display name"
          hint="up to 40 chars"
          value={form.name}
          onChange={(e) => { set('name', e.target.value.slice(0, 40)); }}
          maxLength={40}
        />

        <Field
          label="URL slug"
          hint="acme.app/{slug}"
          value={form.slug}
          onChange={(e) => { set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
        />

        <Field
          label="Website"
          value={form.website}
          onChange={(e) => { set('website', e.target.value); }}
          trailing={<Globe className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />}
        />

        <Field
          label="Description"
          hint="shown on the org dashboard"
          value={form.description}
          onChange={(e) => { set('description', e.target.value); }}
        />
      </Section>

      <Section title="Defaults" hint="Per-user fallbacks when nothing else is selected.">
        <Row label="Default workspace" sub="Where new members land after signing in.">
          <select
            value={form.defaultWorkspace}
            onChange={(e) => { set('defaultWorkspace', e.target.value); }}
            className="h-8 rounded-md px-2.5 text-base outline-none cursor-pointer"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-strong)',
              minWidth: 160,
            }}
          >
            {WORKSPACES.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Row>
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
        onSave={save}
        onDiscard={() => { setForm(INITIAL); }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => { setConfirmDelete(false); }}
        onConfirm={() => { setConfirmDelete(false); }}
        title={`Delete ${form.name}?`}
        confirmLabel="I understand, delete"
        width={460}
        requireTypedConfirmation={form.name}
        description={
          <>
            This permanently deletes the organization, every workspace inside it, billing records, and all
            agent history. People keep their accounts but lose access. Type <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{form.name}</span> below to confirm.
          </>
        }
      />
    </OrgShell>
  );
}
