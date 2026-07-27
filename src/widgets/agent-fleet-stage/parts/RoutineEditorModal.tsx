import { useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y, IconButton } from '@shared/ui';
import type { Routine, TranslateFn } from './types';
import { simulateDryRun } from './routine-editor/dryRun';
import {
  DefinitionTab, GuardrailsTab, ScheduleTab, DryRunTab, type EditorTones,
} from './routine-editor/tabs';

type Tab = 'definition' | 'guardrails' | 'schedule' | 'dryRun';

const TABS: Tab[] = ['definition', 'guardrails', 'schedule', 'dryRun'];

export default function RoutineEditorModal({
  routine, isDark, t, onClose, onSave,
}: {
  routine: Routine;
  isDark: boolean;
  t: TranslateFn;
  onClose: () => void;
  onSave: (next: Routine) => void;
}) {
  const [draft, setDraft] = useState<Routine>(routine);
  const [tab, setTab] = useState<Tab>('definition');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-focus, focus-trap, focus-restore and Escape-to-close. The modal is
  // conditionally mounted by its parent, so it is always effectively open.
  useDialogA11y(dialogRef, true, onClose);

  const surface = 'bg-[var(--bg-surface)] border-[var(--border-strong)]';
  const heading = 'text-[var(--fg-strong)]';
  const muted = 'text-[var(--fg-muted)]';
  const faint = 'text-[var(--fg-subtle)]';
  const labelTone = 'text-[var(--fg-subtle)]';
  const inputBg = 'bg-[var(--bg-hover)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] border-[var(--border-default)]';

  const dryRun = useMemo(() => simulateDryRun(draft), [draft]);

  const tones: EditorTones = { heading, muted, faint, labelTone, inputBg };

  // Tab key → panel. Record map keeps the body open for new tabs (OCP).
  const PANELS: Record<Tab, ReactNode> = {
    definition: <DefinitionTab draft={draft} setDraft={setDraft} tones={tones} t={t} />,
    guardrails: <GuardrailsTab draft={draft} setDraft={setDraft} tones={tones} t={t} />,
    schedule: <ScheduleTab draft={draft} setDraft={setDraft} tones={tones} t={t} />,
    dryRun: <DryRunTab dryRun={dryRun} tones={tones} t={t} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Dismiss"
        className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm border-0 p-0 cursor-default`}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative w-full max-w-[640px] max-h-[80vh] flex flex-col rounded-xl border shadow-2xl ${surface}`}
      >
        <div className={`shrink-0 flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)]`}>
          <h2 className={`text-base font-bold ${heading}`}>{t('editor.title', { name: draft.name })}</h2>
          <IconButton icon={X} label="Close" onClick={onClose} size="sm" />
        </div>

        <div className={`shrink-0 px-5 py-2 border-b border-[var(--border-default)]`}>
          <div className={`flex items-center gap-px rounded-md p-px bg-[var(--bg-hover)]`}>
            {TABS.map((tk) => (
              <button
                key={tk}
                type="button"
                onClick={() => { setTab(tk); }}
                aria-pressed={tab === tk}
                className={`flex-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                  tab === tk
                    ? 'ring-1 ring-inset ring-[var(--fg-accent)] text-[var(--fg-strong)]'
                    : 'text-[var(--fg-subtle)] hover:text-[var(--fg-default)]'
                }`}
              >
                {t(`editor.tab${tk.charAt(0).toUpperCase() + tk.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin px-5 py-4">
          {PANELS[tab]}
        </div>

        <div className={`shrink-0 flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-default)]`}>
          <button
            type="button"
            onClick={onClose}
            className={`text-sm font-mono px-3 py-1.5 rounded-md transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-elevated)]`}
          >
            {t('editor.discard')}
          </button>
          <button
            type="button"
            onClick={() => { onSave(draft); }}
            className="text-sm font-mono px-3 py-1.5 rounded-md border border-[color:var(--intent-success-fg)] bg-[color:var(--intent-success-bg)] hover:bg-[color:var(--intent-success-bg)] text-[color:var(--intent-success-fg)] transition-colors"
          >
            {t('editor.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
