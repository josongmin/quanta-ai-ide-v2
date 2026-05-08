// ─────────────────────────────────────────────────────────────────────────
// Left-rail PR search. ⌘K / Ctrl+K to focus — standard convention
// (Linear, GitHub, Slack).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@shared/i18n';

export default function SearchBar({
  value, onChange,
}: { value: string; onChange: (s: string) => void }) {
  const { t } = useTranslation('review');
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div className="shrink-0 px-3 pt-2 pb-2 border-b border-white/[0.06]">
      <div
        className={`flex items-center gap-2 px-2 h-8 border-b transition-colors ${
          focused ? 'border-white/30' : 'border-transparent hover:border-white/10'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-white/40" strokeWidth={2} />
        <input
          ref={ref}
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          onFocus={() => { setFocused(true); }}
          onBlur={() => { setFocused(false); }}
          placeholder={t('search.placeholder')}
          className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-white/85 placeholder:text-white/30"
        />
        {value.length > 0 ? (
          <button
            type="button"
            aria-label={t('search.clearAria')}
            onClick={() => { onChange(''); ref.current?.focus(); }}
            className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-white/40 hover:text-white/70"
          >
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="shrink-0 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-white/30 leading-none">
            ⌘K
          </span>
        )}
      </div>
    </div>
  );
}
