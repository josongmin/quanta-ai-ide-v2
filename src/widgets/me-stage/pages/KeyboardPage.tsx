import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, RotateCcw, AlertTriangle, Download, Upload } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';
import { DEFAULTS, type Shortcut } from './parts/keyboard/types';
import { ShortcutRow } from './parts/keyboard/ShortcutRow';
import { RecordModal } from './parts/keyboard/RecordModal';

export default function KeyboardPage() {
  const { t } = useTranslation('me');
  const [shortcuts, setShortcuts] = useState(DEFAULTS);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Shortcut | null>(null);

  const groups = useMemo(() => {
    const filtered = q.trim()
      ? shortcuts.filter((s) =>
          s.label.toLowerCase().includes(q.toLowerCase())
          || s.current.toLowerCase().includes(q.toLowerCase())
          || s.group.toLowerCase().includes(q.toLowerCase()))
      : shortcuts;
    const m = new Map<string, Shortcut[]>();
    for (const s of filtered) {
      const arr = m.get(s.group) ?? [];
      arr.push(s);
      m.set(s.group, arr);
    }
    return Array.from(m.entries());
  }, [shortcuts, q]);

  const conflicts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shortcuts) counts.set(s.current, (counts.get(s.current) ?? 0) + 1);
    return shortcuts.filter((s) => (counts.get(s.current) ?? 0) > 1);
  }, [shortcuts]);

  const dirty = shortcuts.some((s) => s.current !== s.defaultKey);

  const updateShortcut = (id: string, key: string) => {
    setShortcuts((all) => all.map((s) => (s.id === id ? { ...s, current: key } : s)));
  };
  const resetOne = (id: string) => {
    setShortcuts((all) => all.map((s) => (s.id === id ? { ...s, current: s.defaultKey } : s)));
  };
  const resetAll = () => { setShortcuts(DEFAULTS); };

  return (
    <MeShell
      title={t('keyboard.title')}
      subtitle={t('keyboard.subtitle')}
      topRight={
        <div className="flex items-center gap-1.5">
          <Button leading={<Download className="w-3 h-3" />} onClick={() => { downloadJson(shortcuts); }}>
            {t('keyboard.export')}
          </Button>
          <Button leading={<Upload className="w-3 h-3" />}>{t('keyboard.import')}</Button>
          {dirty && (
            <Button leading={<RotateCcw className="w-3 h-3" />} onClick={resetAll}>
              {t('keyboard.resetAll')}
            </Button>
          )}
        </div>
      }
    >
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md mb-5"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Search className="w-3.5 h-3.5" style={{ color: 'var(--fg-subtle)' }} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); }}
          placeholder={t('keyboard.searchPlaceholder')}
          className="flex-1 bg-transparent outline-none text-base"
          style={{ color: 'var(--fg-strong)' }}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); }}
            className="text-xs uppercase tracking-eyebrow font-medium px-1.5 py-0.5 rounded"
            style={{ color: 'var(--fg-subtle)', background: 'var(--bg-active)' }}>
            {t('keyboard.clear')}
          </button>
        )}
      </div>

      {conflicts.length > 0 && (
        <div
          className="flex items-start gap-3 px-3 py-2.5 rounded-md mb-5 onb-stagger"
          style={{
            background: 'var(--intent-warn-bg)',
            border: '1px solid var(--intent-warn-fg)',
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {t('keyboard.conflicts', { count: conflicts.length })}
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              {t('keyboard.conflictBody', { list: conflicts.map((c) => c.label).join(', ') })}
            </span>
          </div>
        </div>
      )}

      {groups.map(([groupTitle, items]) => (
        <Section key={groupTitle} title={groupTitle}>
          <div
            className="flex flex-col rounded-md overflow-hidden"
            style={{ border: '1px solid var(--border-muted)' }}
          >
            {items.map((s, i) => (
              <ShortcutRow
                key={s.id}
                shortcut={s}
                top={i === 0}
                conflict={conflicts.includes(s)}
                onEdit={() => { setEditing(s); }}
                onReset={() => { resetOne(s.id); }}
              />
            ))}
          </div>
        </Section>
      ))}

      {groups.length === 0 && (
        <div className="text-center py-12 text-base" style={{ color: 'var(--fg-subtle)' }}>
          {t('keyboard.noMatch', { query: q })}
        </div>
      )}

      {editing && (
        <RecordModal
          shortcut={editing}
          onClose={() => { setEditing(null); }}
          onSave={(key) => { updateShortcut(editing.id, key); setEditing(null); }}
        />
      )}
    </MeShell>
  );
}

function downloadJson(shortcuts: Shortcut[]) {
  const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sefield-keymap.json';
  a.click();
  URL.revokeObjectURL(url);
}
