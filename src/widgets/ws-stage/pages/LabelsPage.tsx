import { useMemo, useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, Check, AlertTriangle,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button } from '@shared/ui/forms';

type ColorChoice = {
  id: string;
  label: string;
  value: string; // CSS color (var() or hex)
};

const COLORS: ColorChoice[] = [
  { id: 'success', label: 'Success', value: 'var(--intent-success-fg)' },
  { id: 'warn',    label: 'Warn',    value: 'var(--intent-warn-fg)' },
  { id: 'danger',  label: 'Danger',  value: 'var(--intent-danger-fg)' },
  { id: 'brand',   label: 'Brand',   value: 'var(--brand-vivid)' },
  { id: 'indigo',  label: 'Indigo',  value: '#6366f1' },
  { id: 'amber',   label: 'Amber',   value: '#f59e0b' },
  { id: 'teal',    label: 'Teal',    value: '#14b8a6' },
  { id: 'slate',   label: 'Slate',   value: '#64748b' },
];

type Label = {
  id: string;
  name: string;
  description: string;
  colorId: string;
  usage: number;
};

const SEED: Label[] = [
  { id: 'l1',  name: 'bug',          description: 'Something is not working as expected.',         colorId: 'danger',  usage: 142 },
  { id: 'l2',  name: 'feature',      description: 'New capability or product surface.',             colorId: 'brand',   usage: 87  },
  { id: 'l3',  name: 'security',     description: 'Vulnerability, hardening, or auth-related.',     colorId: 'danger',  usage: 23  },
  { id: 'l4',  name: 'breaking',     description: 'Backwards-incompatible API or behavior change.', colorId: 'warn',    usage: 11  },
  { id: 'l5',  name: 'perf',         description: 'Performance regression, profiling, or fix.',     colorId: 'amber',   usage: 34  },
  { id: 'l6',  name: 'docs',         description: 'Documentation, examples, comments.',             colorId: 'teal',    usage: 56  },
  { id: 'l7',  name: 'good-first',   description: 'Approachable for new contributors.',             colorId: 'success', usage: 19  },
  { id: 'l8',  name: 'refactor',     description: 'Internal restructuring with no behavior change.',colorId: 'slate',   usage: 41  },
  { id: 'l9',  name: 'chore',        description: 'Tooling, deps, or maintenance.',                 colorId: 'slate',   usage: 73  },
  { id: 'l10', name: 'design',       description: 'UI, UX, or visual system change.',               colorId: 'indigo',  usage: 28  },
  { id: 'l11', name: 'discussion',   description: 'Open question, RFC, or design debate.',          colorId: 'indigo',  usage: 9   },
  { id: 'l12', name: 'wontfix',      description: 'Closed without action by design.',               colorId: 'slate',   usage: 6   },
];

type Editing =
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
  | null;

export default function LabelsPage() {
  const [labels, setLabels] = useState<Label[]>(SEED);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmDelete, setConfirmDelete] = useState<Label | null>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return labels;
    const needle = q.toLowerCase();
    return labels.filter((l) =>
      l.name.toLowerCase().includes(needle)
      || l.description.toLowerCase().includes(needle));
  }, [labels, q]);

  const upsert = (next: Omit<Label, 'usage'> & { usage?: number }) => {
    setLabels((all) => {
      const exists = all.some((l) => l.id === next.id);
      if (exists) return all.map((l) => (l.id === next.id ? { ...l, ...next, usage: l.usage } : l));
      return [...all, { ...next, usage: 0 }];
    });
  };

  const remove = (id: string) => {
    setLabels((all) => all.filter((l) => l.id !== id));
  };

  return (
    <WsShell
      orgName="ACME, Inc."
      orgSlug="acme"
      wsName="monorepo"
      wsSlug="monorepo"
      title="Labels"
      subtitle="Tag taxonomy for issues and pull requests in this workspace."
      topRight={
        <Button
          variant="primary"
          size="md"
          leading={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setEditing({ mode: 'new' }); }}
        >
          New label
        </Button>
      }
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
          {filtered.length} of {labels.length} labels
        </span>
        <div
          className="flex items-center gap-2 h-8 px-2.5 rounded-md"
          style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-default)', minWidth: 240 }}
        >
          <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); }}
            placeholder="Search labels…"
            className="flex-1 bg-transparent outline-none text-[12px]"
            style={{ color: 'var(--fg-strong)' }}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); }}
              style={{ color: 'var(--fg-subtle)' }}
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Inline editor */}
      {editing && (
        <LabelEditor
          key={editing.mode === 'edit' ? editing.id : 'new'}
          initial={
            editing.mode === 'edit'
              ? labels.find((l) => l.id === editing.id) ?? null
              : null
          }
          onCancel={() => { setEditing(null); }}
          onSave={(payload) => {
            upsert({
              id: editing.mode === 'edit' ? editing.id : `l${Date.now().toString(36)}`,
              ...payload,
            });
            setEditing(null);
          }}
        />
      )}

      {/* Table */}
      <div
        className="rounded-md overflow-hidden"
        style={{ border: '1px solid var(--border-muted)' }}
      >
        <div
          className="grid items-center px-3 h-9 text-[10px] uppercase tracking-[0.14em] font-semibold"
          style={{
            gridTemplateColumns: '180px 1fr 80px 70px',
            gap: 12,
            background: 'var(--bg-surface-muted)',
            color: 'var(--fg-subtle)',
            borderBottom: '1px solid var(--border-muted)',
          }}
        >
          <span>Label</span>
          <span>Description</span>
          <span className="text-right">Usage</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
            <Search className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {q ? `No matches for "${q}"` : 'No labels yet'}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
              {q ? 'Try a different keyword.' : 'Create your first label to get started.'}
            </span>
          </div>
        ) : (
          filtered.map((l, i) => {
            const color = COLORS.find((c) => c.id === l.colorId)?.value ?? 'var(--fg-muted)';
            return (
              <div
                key={l.id}
                role="row"
                className="grid items-center px-3 h-12 text-[12px] transition-colors"
                style={{
                  gridTemplateColumns: '180px 1fr 80px 70px',
                  gap: 12,
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-muted)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Chip color={color} name={l.name} />
                <span className="truncate" style={{ color: 'var(--fg-default)' }}>{l.description}</span>
                <span className="text-right tabular-nums" style={{ color: 'var(--fg-muted)' }}>{l.usage}</span>
                <div className="flex justify-end items-center gap-0.5">
                  <RowAction
                    icon={Pencil}
                    label="Edit"
                    onClick={() => { setEditing({ mode: 'edit', id: l.id }); }}
                  />
                  <RowAction
                    icon={Trash2}
                    label="Delete"
                    danger
                    onClick={() => { setConfirmDelete(l); }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirmDelete && (
        <ConfirmDelete
          label={confirmDelete}
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
        />
      )}
    </WsShell>
  );
}

function Chip({ color, name }: { color: string; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium w-fit"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-muted)',
        color: 'var(--fg-strong)',
      }}
    >
      <span
        aria-hidden
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="font-mono">{name}</span>
    </span>
  );
}

function RowAction({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-muted)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function LabelEditor({
  initial, onCancel, onSave,
}: {
  initial: Label | null;
  onCancel: () => void;
  onSave: (payload: { name: string; description: string; colorId: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [colorId, setColorId] = useState(initial?.colorId ?? COLORS[0].id);

  const valid = name.trim().length > 0;
  const previewColor = COLORS.find((c) => c.id === colorId)?.value ?? 'var(--fg-muted)';

  return (
    <div
      className="rounded-md p-3 mb-3 flex flex-col gap-3"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {initial ? 'Edit label' : 'New label'}
          </span>
          <Chip color={previewColor} name={name.trim() || 'preview'} />
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close editor"
          className="w-6 h-6 rounded-md inline-flex items-center justify-center"
          style={{ color: 'var(--fg-muted)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder="label-name"
          className="h-8 rounded-md px-2.5 text-[12px] outline-none font-mono"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        />
        <input
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          placeholder="Short description shown in pickers and lists"
          className="h-8 rounded-md px-2.5 text-[12px] outline-none"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.14em] font-medium mr-1" style={{ color: 'var(--fg-subtle)' }}>
          Color
        </span>
        {COLORS.map((c) => {
          const active = c.id === colorId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { setColorId(c.id); }}
              aria-label={c.label}
              className="w-6 h-6 rounded-full inline-flex items-center justify-center transition-transform"
              style={{
                background: c.value,
                border: `2px solid ${active ? 'var(--fg-strong)' : 'var(--border-muted)'}`,
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {active && <Check className="w-3 h-3" style={{ color: 'var(--bg-canvas)' }} />}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => { onSave({ name: name.trim(), description: description.trim(), colorId }); }}
        >
          {initial ? 'Save changes' : 'Create label'}
        </Button>
      </div>
    </div>
  );
}

function ConfirmDelete({
  label, onCancel, onConfirm,
}: { label: Label; onCancel: () => void; onConfirm: () => void }) {
  return (
    <>
      <button type="button" aria-label="Dismiss" className="fixed inset-0 z-40 border-0 p-0 cursor-default" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel} />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
              Delete label?
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
            <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{label.name}</span> will be
            removed from {label.usage} {label.usage === 1 ? 'item' : 'items'}. This can&apos;t be undone.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border-muted)', background: 'var(--bg-surface-muted)' }}
        >
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="md" onClick={onConfirm}>Delete label</Button>
        </div>
      </div>
    </>
  );
}
