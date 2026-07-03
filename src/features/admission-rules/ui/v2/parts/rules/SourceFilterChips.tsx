import type { AdmissionRule, RuleSource } from '@entities/admission';
import { useV2 } from '../tokens';

// Segmented source filter (all / native / eslint / …) with per-source
// counts, shown in the rule-list toolbar.
export function SourceFilterChips({
  value, onChange, rules,
}: {
  value: RuleSource | 'all';
  onChange: (v: RuleSource | 'all') => void;
  rules: AdmissionRule[];
}) {
  const t = useV2();
  const opts: (RuleSource | 'all')[] = ['all', 'native', 'eslint', 'semgrep', 'codeql', 'custom'];
  return (
    <div
      className="flex items-center gap-px rounded-md overflow-hidden"
      style={{ background: t.inset, border: `1px solid ${t.borderSoft}` }}
    >
      {opts.map((o) => {
        const active = value === o;
        const count = o === 'all' ? rules.length : rules.filter((r) => r.source === o).length;
        return (
          <button type="button"
            key={o}
            onClick={() => { onChange(o); }}
            className="px-2 py-1 text-xs font-mono transition-colors"
            style={{
              background: active ? t.hoverActive : 'transparent',
              color: active ? t.textHi : t.textSubtle,
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = t.textMuted; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = t.textSubtle; }}
          >
            {o}
            <span className="ml-1 opacity-60 tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
