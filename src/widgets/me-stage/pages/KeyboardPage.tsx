import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Keyboard, RotateCcw, AlertTriangle, Download, Upload, X } from 'lucide-react';
import { MeShell } from '../parts/MeShell';
import { Section, Button } from '@shared/ui/forms';

type Shortcut = {
  id: string;
  label: string;
  group: string;
  defaultKey: string;
  current: string;
  description: string;
};

const DEFAULTS: Shortcut[] = [
  // Global
  { id: 'palette',    group: 'Global', label: 'Open command palette',     defaultKey: '⌘K',     current: '⌘K',     description: 'Search and run any command' },
  { id: 'help',       group: 'Global', label: 'Open help & shortcuts',    defaultKey: '⌘/',     current: '⌘/',     description: 'This page, basically' },
  { id: 'theme',      group: 'Global', label: 'Toggle dark/light theme',  defaultKey: '⌘⇧T',    current: '⌘⇧T',    description: 'Cycle theme manually' },
  { id: 'settings',   group: 'Global', label: 'Open settings',            defaultKey: '⌘,',     current: '⌘,',     description: 'This page, basically' },
  { id: 'inbox',      group: 'Global', label: 'Open inbox',               defaultKey: 'gI',     current: 'gI',     description: 'Two-key sequence' },

  // Navigation
  { id: 'tab.intel',  group: 'Navigation', label: 'Go to Intelligence', defaultKey: '⌘1', current: '⌘1', description: '' },
  { id: 'tab.invest', group: 'Navigation', label: 'Go to Investigate',  defaultKey: '⌘2', current: '⌘2', description: '' },
  { id: 'tab.code',   group: 'Navigation', label: 'Go to Coding',       defaultKey: '⌘3', current: '⌘3', description: '' },
  { id: 'tab.agent',  group: 'Navigation', label: 'Go to Agents',       defaultKey: '⌘4', current: '⌘4', description: '' },
  { id: 'tab.review', group: 'Navigation', label: 'Go to Reviews',      defaultKey: '⌘5', current: '⌘5', description: '' },
  { id: 'tab.adm',    group: 'Navigation', label: 'Go to Admission',    defaultKey: '⌘6', current: '⌘6', description: '' },
  { id: 'tab.fix',    group: 'Navigation', label: 'Go to Fixes',        defaultKey: '⌘7', current: '⌘7', description: '' },

  // Editing
  { id: 'save',       group: 'Editing', label: 'Save current draft',    defaultKey: '⌘S',  current: '⌘S',  description: '' },
  { id: 'submit',     group: 'Editing', label: 'Submit message / form', defaultKey: '⌘↵',  current: '⌘↵',  description: 'In any chat composer' },
  { id: 'cancel',     group: 'Editing', label: 'Cancel current action', defaultKey: 'Esc', current: 'Esc', description: '' },
  { id: 'find',       group: 'Editing', label: 'Find in current view',  defaultKey: '⌘F',  current: '⌘F',  description: '' },

  // Reviews
  { id: 'rev.next',   group: 'Reviews', label: 'Next review item',     defaultKey: 'J',  current: 'J',  description: 'vim-like' },
  { id: 'rev.prev',   group: 'Reviews', label: 'Previous review item', defaultKey: 'K',  current: 'K',  description: 'vim-like' },
  { id: 'rev.approve',group: 'Reviews', label: 'Approve current PR',    defaultKey: '⌘⇧↵', current: '⌘⇧↵', description: 'Holds modifier on purpose' },
  { id: 'rev.req',    group: 'Reviews', label: 'Request changes',       defaultKey: '⌘⇧R', current: '⌘⇧R', description: '' },

  // Investigate
  { id: 'inv.ask',    group: 'Investigate', label: 'Ask a new question',  defaultKey: '⌘⇧A', current: '⌘⇧A', description: '' },
  { id: 'inv.handoff',group: 'Investigate', label: 'Hand off investigation',defaultKey: '⌘⇧H', current: '⌘⇧H', description: '' },

  // Agents & fixes
  { id: 'ag.run',     group: 'Agents & Fixes', label: 'Run default agent',    defaultKey: '⌘⏎', current: '⌘⏎', description: '' },
  { id: 'ag.stop',    group: 'Agents & Fixes', label: 'Stop running agent',   defaultKey: '⌘.', current: '⌘.', description: '' },

  // AI
  { id: 'ai.suggest', group: 'AI', label: 'Trigger inline suggestion', defaultKey: '⌘.', current: 'Alt+\\', description: 'Ghost text in editor' },
  { id: 'ai.accept',  group: 'AI', label: 'Accept suggestion',         defaultKey: 'Tab', current: 'Tab', description: '' },
  { id: 'ai.dismiss', group: 'AI', label: 'Dismiss suggestion',        defaultKey: 'Esc', current: 'Esc', description: '' },
];

export default function KeyboardPage() {
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
      title="Keyboard"
      subtitle="Customize shortcuts. Use the search to find one fast — when you record a new combo we'll detect conflicts."
      topRight={
        <div className="flex items-center gap-1.5">
          <Button leading={<Download className="w-3 h-3" />} onClick={() => { downloadJson(shortcuts); }}>
            Export
          </Button>
          <Button leading={<Upload className="w-3 h-3" />}>Import</Button>
          {dirty && (
            <Button leading={<RotateCcw className="w-3 h-3" />} onClick={resetAll}>
              Reset all
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
          placeholder="Search by command, group, or keystroke…"
          className="flex-1 bg-transparent outline-none text-[12px]"
          style={{ color: 'var(--fg-strong)' }}
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); }}
            className="text-[10px] uppercase tracking-[0.14em] font-medium px-1.5 py-0.5 rounded"
            style={{ color: 'var(--fg-subtle)', background: 'var(--bg-active)' }}>
            Clear
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
          <div className="flex flex-col gap-1 text-[11px]">
            <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
              {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} detected
            </span>
            <span style={{ color: 'var(--fg-muted)' }}>
              When two commands share the same combo, only the last-defined one fires.
              Affected: {conflicts.map((c) => c.label).join(', ')}.
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
        <div className="text-center py-12 text-[12px]" style={{ color: 'var(--fg-subtle)' }}>
          No shortcuts match &quot;{q}&quot;.
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

function ShortcutRow({
  shortcut, top, conflict, onEdit, onReset,
}: {
  shortcut: Shortcut;
  top: boolean;
  conflict: boolean;
  onEdit: () => void;
  onReset: () => void;
}) {
  const customized = shortcut.current !== shortcut.defaultKey;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <Keyboard className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[12px] font-medium" style={{ color: 'var(--fg-strong)' }}>
          {shortcut.label}
        </span>
        {shortcut.description && (
          <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
            {shortcut.description}
          </span>
        )}
      </div>
      <KeyChip combo={shortcut.current} conflict={conflict} customized={customized} />
      <div className="flex items-center gap-1.5">
        <Button onClick={onEdit}>Record new</Button>
        <Button variant="ghost" onClick={onReset} disabled={!customized}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function KeyChip({ combo, conflict, customized }: { combo: string; conflict: boolean; customized: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 h-7 px-2 rounded text-[11px] font-mono tabular-nums shrink-0"
      style={{
        background: conflict ? 'var(--intent-warn-bg)' : customized ? 'color-mix(in srgb, var(--fg-accent) 14%, transparent)' : 'var(--bg-surface-muted)',
        color: conflict ? 'var(--intent-warn-fg)' : customized ? 'var(--fg-accent)' : 'var(--fg-default)',
        border: `1px solid ${conflict ? 'var(--intent-warn-fg)' : customized ? 'var(--fg-accent)' : 'var(--border-muted)'}`,
        minWidth: 60,
        justifyContent: 'center',
      }}
    >
      {combo}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Record modal — listens for keydown and shows what was captured.

function RecordModal({
  shortcut, onClose, onSave,
}: {
  shortcut: Shortcut;
  onClose: () => void;
  onSave: (key: string) => void;
}) {
  const [recorded, setRecorded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' && !recorded) {
        onClose();
        return;
      }
      const combo = formatCombo(e);
      if (combo) setRecorded(combo);
    };
    window.addEventListener('keydown', handler, true);
    return () => { window.removeEventListener('keydown', handler, true); };
  }, [onClose, recorded]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 popover-backdrop-in"
      style={{ background: 'var(--bg-scrim)' }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="w-full max-w-[440px] rounded-md p-5 popover-panel-in flex flex-col gap-4 outline-none"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Record shortcut for &quot;{shortcut.label}&quot;
        </h3>
        <p className="text-[11px] leading-snug" style={{ color: 'var(--fg-muted)' }}>
          Press the keys you want to use. Modifier-only combos like ⇧ alone won&apos;t be captured.
          Press <span className="font-mono">Esc</span> twice to cancel without saving.
        </p>

        <div
          className="flex items-center justify-center h-20 rounded-md font-mono text-[18px] tabular-nums onb-stagger"
          style={{
            background: 'var(--bg-canvas)',
            border: `1.5px ${recorded ? 'solid' : 'dashed'} ${recorded ? 'var(--fg-accent)' : 'var(--border-default)'}`,
            color: recorded ? 'var(--fg-accent)' : 'var(--fg-subtle)',
          }}
        >
          {recorded ?? 'Listening…'}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
            Default: <span className="font-mono">{shortcut.defaultKey}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="md" onClick={onClose}>
              <X className="w-3 h-3" />
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!recorded}
              onClick={() => { if (recorded) onSave(recorded); }}
            >
              Use this shortcut
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCombo(e: KeyboardEvent): string | null {
  // Discard modifier-only events.
  if (['Control', 'Meta', 'Shift', 'Alt', 'OS'].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.metaKey)  parts.push('⌘');
  if (e.ctrlKey)  parts.push('⌃');
  if (e.shiftKey) parts.push('⇧');
  if (e.altKey)   parts.push('⌥');

  let key = e.key;
  if (key === 'Enter')      key = '↵';
  else if (key === 'Escape') key = 'Esc';
  else if (key === 'ArrowLeft')  key = '←';
  else if (key === 'ArrowRight') key = '→';
  else if (key === 'ArrowUp')    key = '↑';
  else if (key === 'ArrowDown')  key = '↓';
  else if (key === ' ')          key = 'Space';
  else if (key.length === 1)     key = key.toUpperCase();

  parts.push(key);
  return parts.join('');
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
