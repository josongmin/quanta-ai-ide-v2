import type { PhaseId } from '../../model/store';
import { useVfx } from './tokens';

const PHASES: { id: PhaseId; label: string; sub: string }[] = [
  { id: 1, label: 'phase 1', sub: 'static proof + draft' },
  { id: 2, label: 'phase 2', sub: 'dynamic + post-patch + routing' },
  { id: 3, label: 'phase 3', sub: 'auto-submit · rollback · feedback' },
];

export function PhaseTabs({ active, onChange }: { active: PhaseId; onChange: (p: PhaseId) => void }) {
  const t = useVfx();
  return (
    <div
      className="rounded-lg border p-1 inline-flex"
      style={{ background: t.inset, borderColor: t.borderSoft }}
    >
      {PHASES.map((p) => {
        const on = p.id === active;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => { onChange(p.id); }}
            className="rounded px-3 py-1.5 transition-all text-left"
            style={{
              background: on ? t.cardBacking : 'transparent',
              boxShadow: on ? (t.isDark ? '0 1px 0 rgba(255,255,255,0.04)' : '0 1px 2px rgba(0,0,0,0.06)') : 'none',
              border: `1px solid ${on ? t.border : 'transparent'}`,
              minWidth: 156,
            }}
          >
            <div
              className="text-[10px] font-black uppercase tracking-[0.16em]"
              style={{ color: on ? t.textHi : t.textMuted }}
            >
              {p.label}
            </div>
            <div className="text-[9.5px] mt-0.5" style={{ color: on ? t.textMuted : t.textFaint }}>
              {p.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}
