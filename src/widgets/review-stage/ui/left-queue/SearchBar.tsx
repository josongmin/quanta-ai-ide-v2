import { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// 2. SearchBar — refined version (was a separate function in ReviewStage).
// We re-implement here so LeftQueue is self-contained.
// ─────────────────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="shrink-0 px-3 pb-2">
      <div
        className={`flex items-center gap-2 px-2.5 h-8 rounded-md transition-colors ${
          focused ? 'bg-[var(--bg-active)]' : 'bg-[var(--bg-surface-muted)] hover:bg-[var(--bg-hover)]'
        }`}
        style={{ border: '1px solid var(--border-default)' }}
      >
        <SearchIcon className="w-3.5 h-3.5 text-[var(--fg-subtle)] shrink-0" strokeWidth={2} />
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onFocus={() => { setFocused(true); }}
          onBlur={() => { setFocused(false); }}
          placeholder="검색..."
          className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-[var(--fg-strong)] placeholder:text-[var(--fg-subtle)]"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => { onChange(''); }}
            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-[var(--fg-subtle)] hover:text-[var(--fg-default)]"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="shrink-0 text-[10px] font-mono text-[var(--fg-subtle)] leading-none">
            ⌘K
          </span>
        )}
      </div>
    </div>
  );
}
