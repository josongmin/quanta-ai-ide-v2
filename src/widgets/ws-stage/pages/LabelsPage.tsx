import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, X, Check,
} from 'lucide-react';
import { WsShell } from '../parts/WsShell';
import { Button } from '@shared/ui/forms';
import {
  ConfirmDialog, SearchInput, DataTable, EmptyState, IconButton,
} from '@shared/ui';

type ColorChoice = {
  id: string;
  value: string; // CSS color (var() or hex)
};

// label aria labels resolve from ws:labels.colors.<id> at render time.
const COLORS: ColorChoice[] = [
  { id: 'success', value: 'var(--intent-success-fg)' },
  { id: 'warn',    value: 'var(--intent-warn-fg)' },
  { id: 'danger',  value: 'var(--intent-danger-fg)' },
  { id: 'brand',   value: 'var(--fg-accent)' },
  { id: 'indigo',  value: '#6366f1' },
  { id: 'amber',   value: '#f59e0b' },
  { id: 'teal',    value: '#14b8a6' },
  { id: 'slate',   value: '#64748b' },
];

type Label = {
  id: string;
  name: string;
  description: string;
  colorId: string;
  usage: number;
};

// name = code-token tag (rendered mono, not translated); description seeded
// from ws:labels.seed.<seedKey> at mount.
const SEED_META: { id: string; name: string; seedKey: string; colorId: string; usage: number }[] = [
  { id: 'l1',  name: 'bug',        seedKey: 'bug',        colorId: 'danger',  usage: 142 },
  { id: 'l2',  name: 'feature',    seedKey: 'feature',    colorId: 'brand',   usage: 87  },
  { id: 'l3',  name: 'security',   seedKey: 'security',   colorId: 'danger',  usage: 23  },
  { id: 'l4',  name: 'breaking',   seedKey: 'breaking',   colorId: 'warn',    usage: 11  },
  { id: 'l5',  name: 'perf',       seedKey: 'perf',       colorId: 'amber',   usage: 34  },
  { id: 'l6',  name: 'docs',       seedKey: 'docs',       colorId: 'teal',    usage: 56  },
  { id: 'l7',  name: 'good-first', seedKey: 'goodFirst',  colorId: 'success', usage: 19  },
  { id: 'l8',  name: 'refactor',   seedKey: 'refactor',   colorId: 'slate',   usage: 41  },
  { id: 'l9',  name: 'chore',      seedKey: 'chore',      colorId: 'slate',   usage: 73  },
  { id: 'l10', name: 'design',     seedKey: 'design',     colorId: 'indigo',  usage: 28  },
  { id: 'l11', name: 'discussion', seedKey: 'discussion', colorId: 'indigo',  usage: 9   },
  { id: 'l12', name: 'wontfix',    seedKey: 'wontfix',    colorId: 'slate',   usage: 6   },
];

type Editing =
  | { mode: 'new' }
  | { mode: 'edit'; id: string }
  | null;

export default function LabelsPage() {
  const { t } = useTranslation('ws');
  const seed = useMemo<Label[]>(
    () => SEED_META.map((m) => ({ id: m.id, name: m.name, description: t(`labels.seed.${m.seedKey}`), colorId: m.colorId, usage: m.usage })),
    [t],
  );
  const [labels, setLabels] = useState<Label[]>(seed);
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
      title={t('labels.title')}
      subtitle={t('labels.subtitle')}
      topRight={
        <Button
          variant="primary"
          size="md"
          leading={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setEditing({ mode: 'new' }); }}
        >
          {t('labels.newLabel')}
        </Button>
      }
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {t('labels.count', { shown: filtered.length, total: labels.length })}
        </span>
        <SearchInput value={q} onChange={setQ} placeholder={t('labels.searchPlaceholder')} />
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
      <DataTable
        columns="180px 1fr 80px 70px"
        headers={[
          { header: t('labels.colLabel') },
          { header: t('labels.colDescription') },
          { header: t('labels.colUsage'), align: 'right' },
          { header: '' },
        ]}
        rows={filtered}
        rowKey={(l) => l.id}
        empty={
          <EmptyState
            title={q ? t('labels.emptyMatchTitle', { query: q }) : t('labels.emptyTitle')}
            subtitle={q ? t('labels.emptyMatchSub') : t('labels.emptySub')}
          />
        }
        renderRow={(l) => {
          const color = COLORS.find((c) => c.id === l.colorId)?.value ?? 'var(--fg-muted)';
          return (
            <>
              <Chip color={color} name={l.name} />
              <span className="truncate" style={{ color: 'var(--fg-default)' }}>{l.description}</span>
              <span className="text-right tabular-nums" style={{ color: 'var(--fg-muted)' }}>{l.usage}</span>
              <div className="flex justify-end items-center gap-0.5">
                <RowAction
                  icon={Pencil}
                  label={t('labels.edit')}
                  onClick={() => { setEditing({ mode: 'edit', id: l.id }); }}
                />
                <RowAction
                  icon={Trash2}
                  label={t('labels.delete')}
                  danger
                  onClick={() => { setConfirmDelete(l); }}
                />
              </div>
            </>
          );
        }}
      />

      {confirmDelete && (
        <ConfirmDialog
          open
          onCancel={() => { setConfirmDelete(null); }}
          onConfirm={() => { remove(confirmDelete.id); setConfirmDelete(null); }}
          title={t('labels.deleteTitle')}
          confirmLabel={t('labels.deleteConfirm')}
          description={
            <>
              <span className="font-mono" style={{ color: 'var(--fg-strong)' }}>{confirmDelete.name}</span>{' '}
              {t('labels.deleteDescription', { count: confirmDelete.usage })}
            </>
          }
        />
      )}
    </WsShell>
  );
}

function Chip({ color, name }: { color: string; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-sm font-medium w-fit"
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
  const { t } = useTranslation('ws');
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
          <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
            {initial ? t('labels.editLabel') : t('labels.newLabel')}
          </span>
          <Chip color={previewColor} name={name.trim() || t('labels.preview')} />
        </div>
        <IconButton icon={X} label={t('labels.closeEditorAria')} onClick={onCancel} size="sm" />
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-2">
        <input
          value={name}
          onChange={(e) => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder={t('labels.namePlaceholder')}
          className="h-8 rounded-md px-2.5 text-base outline-none font-mono"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        />
        <input
          value={description}
          onChange={(e) => { setDescription(e.target.value); }}
          placeholder={t('labels.descPlaceholder')}
          className="h-8 rounded-md px-2.5 text-base outline-none"
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs uppercase tracking-eyebrow font-medium mr-1" style={{ color: 'var(--fg-subtle)' }}>
          {t('labels.colorLabel')}
        </span>
        {COLORS.map((c) => {
          const active = c.id === colorId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { setColorId(c.id); }}
              aria-label={t(`labels.colors.${c.id}`)}
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
        <Button variant="ghost" onClick={onCancel}>{t('labels.cancel')}</Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => { onSave({ name: name.trim(), description: description.trim(), colorId }); }}
        >
          {initial ? t('labels.saveChanges') : t('labels.createLabel')}
        </Button>
      </div>
    </div>
  );
}
