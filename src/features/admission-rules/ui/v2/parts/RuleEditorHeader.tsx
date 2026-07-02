import { Save, X as XIcon } from 'lucide-react';
import type { V2Theme } from './tokens';

// Drawer header: title, cost + version badges, Save + Close actions.
export function RuleEditorHeader({
  editingId, cost, versionCount, onSave, onClose, t,
}: {
  editingId: string | null;
  cost: string;
  versionCount: number;
  onSave: () => void;
  onClose: () => void;
  t: V2Theme;
}) {
  return (
    <div
      className="shrink-0 px-5 py-4 flex items-center gap-2 border-b"
      style={{ borderColor: t.borderSoft }}
    >
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.18em]"
        style={{ color: t.textHi }}
      >
        {editingId === null ? 'New rule' : 'Edit rule'}
      </h2>
      <span
        className="text-[9px] font-mono uppercase tracking-[0.18em] px-1.5 py-px rounded-md"
        style={{
          color: t.textMuted,
          background: t.inset,
        }}
      >
        {cost}
      </span>
      {versionCount > 0 && (
        <span
          className="text-[9px] font-mono px-1.5 py-px rounded-md"
          style={{
            color: t.accent,
            background: `${t.accent}15`,
            border: `1px solid ${t.accent}33`,
          }}
        >
          v{versionCount}
        </span>
      )}
      <div className="flex-1" />
      <button type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ background: t.textHi, color: t.page }}
      >
        <Save className="w-3 h-3" />
        Save
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: t.textMuted }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = t.textHi;
          e.currentTarget.style.background = t.hoverSubtle;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = t.textMuted;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
