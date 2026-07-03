import { Trash2 } from 'lucide-react';
import type { RuleSeverity } from '@entities/admission';
import { useAdmissionStore } from '../../../../model/store';
import { SEVERITY_COLOR, useV2 } from '../tokens';

// Appears above the rule table when one or more rows are selected. Bulk
// enable/disable, severity reassignment, delete (with confirm), and clear.
export function BulkActionBar() {
  const t = useV2();
  const selection = useAdmissionStore((s) => s.selection);
  const selectClear = useAdmissionStore((s) => s.selectClear);
  const bulkSetSeverity = useAdmissionStore((s) => s.bulkSetSeverity);
  const bulkSetEnabled = useAdmissionStore((s) => s.bulkSetEnabled);
  const bulkRemove = useAdmissionStore((s) => s.bulkRemove);

  return (
    <div
      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md admv2-rise"
      style={{
        background: `linear-gradient(140deg, ${t.accent}1f, ${t.accent}08)`,
        border: `1px solid ${t.accent}59`,
      }}
    >
      <span className="text-xs font-bold uppercase tracking-eyebrow" style={{ color: t.textHi }}>
        {selection.size} selected
      </span>
      <div className="w-px h-4" style={{ background: t.border }} />
      <button type="button"
        onClick={() => { bulkSetEnabled(true); }}
        className="text-xs font-mono uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
        style={{ color: t.textBody }}
        onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; e.currentTarget.style.background = t.hoverSubtle; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = t.textBody; e.currentTarget.style.background = ''; }}
      >
        enable
      </button>
      <button type="button"
        onClick={() => { bulkSetEnabled(false); }}
        className="text-xs font-mono uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
        style={{ color: t.textBody }}
        onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; e.currentTarget.style.background = t.hoverSubtle; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = t.textBody; e.currentTarget.style.background = ''; }}
      >
        disable
      </button>
      <div className="w-px h-4" style={{ background: t.border }} />
      <span className="text-2xs font-mono uppercase tracking-eyebrow" style={{ color: t.textSubtle }}>severity →</span>
      {(['block', 'warn', 'info'] as RuleSeverity[]).map((sev) => (
        <button type="button"
          key={sev}
          onClick={() => { bulkSetSeverity(sev); }}
          className="text-xs font-mono uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
          style={{
            color: sev === 'block' ? SEVERITY_COLOR.block
              : sev === 'warn' ? SEVERITY_COLOR.warn : t.textMuted,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = t.hoverSubtle; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
        >
          {sev}
        </button>
      ))}
      <div className="flex-1" />
      <button type="button"
        onClick={() => {
          if (confirm(`Delete ${selection.size} rules?`)) bulkRemove();
        }}
        className="flex items-center gap-1 text-xs font-mono uppercase tracking-eyebrow px-2 py-0.5 rounded-md hover:bg-[rgb(from_var(--intent-danger-fg)_r_g_b_/_0.15)] text-[var(--intent-danger-fg)]"
      >
        <Trash2 className="w-3 h-3" />
        delete
      </button>
      <button type="button"
        onClick={selectClear}
        className="text-xs font-mono uppercase tracking-eyebrow px-2 py-0.5 rounded-md"
        style={{ color: t.textMuted }}
        onMouseEnter={(e) => { e.currentTarget.style.color = t.textHi; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = t.textMuted; }}
      >
        clear
      </button>
    </div>
  );
}
