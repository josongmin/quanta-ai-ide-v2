import { useState } from 'react';
import { Globe, Trash2, AlertTriangle } from 'lucide-react';
import { OrgShell } from '../parts/OrgShell';
import { Section, Row, Field, Button, SaveBar } from '@shared/ui/forms';
import { shallowEqual } from '@shared/lib';

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

export default function GeneralPage() {
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
              className="w-12 h-12 rounded-md flex items-center justify-center text-[16px] font-black"
              style={{
                backgroundImage: 'linear-gradient(to bottom right, var(--brand-vivid), var(--fg-link))',
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
            className="h-8 rounded-md px-2.5 text-[12px] outline-none cursor-pointer"
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

      {confirmDelete && (
        <ConfirmDelete
          orgName={form.name}
          onCancel={() => { setConfirmDelete(false); }}
          onConfirm={() => { setConfirmDelete(false); }}
        />
      )}
    </OrgShell>
  );
}

function ConfirmDelete({
  orgName, onCancel, onConfirm,
}: { orgName: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const matches = typed === orgName;
  return (
    <>
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 z-40 bg-transparent border-0 p-0 cursor-default"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>Delete {orgName}?</span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            This permanently deletes the organization, every workspace inside it, billing records, and all
            agent history. People keep their accounts but lose access. Type <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{orgName}</span> below to confirm.
          </p>
          <input
            value={typed}
            onChange={(e) => { setTyped(e.target.value); }}
            placeholder={orgName}
            className="h-9 rounded-md px-3 text-[12px] outline-none font-mono"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', color: 'var(--fg-strong)' }}
          />
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" disabled={!matches} onClick={onConfirm}>I understand, delete</Button>
        </div>
      </div>
    </>
  );
}
