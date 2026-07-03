import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import type { Shortcut } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Record modal — listens for keydown and shows what was captured.

export function RecordModal({
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
        <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>
          Record shortcut for &quot;{shortcut.label}&quot;
        </h3>
        <p className="text-sm leading-snug" style={{ color: 'var(--fg-muted)' }}>
          Press the keys you want to use. Modifier-only combos like ⇧ alone won&apos;t be captured.
          Press <span className="font-mono">Esc</span> twice to cancel without saving.
        </p>

        <div
          className="flex items-center justify-center h-20 rounded-md font-mono text-2xl tabular-nums onb-stagger"
          style={{
            background: 'var(--bg-canvas)',
            border: `1.5px ${recorded ? 'solid' : 'dashed'} ${recorded ? 'var(--fg-accent)' : 'var(--border-default)'}`,
            color: recorded ? 'var(--fg-accent)' : 'var(--fg-subtle)',
          }}
        >
          {recorded ?? 'Listening…'}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
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
