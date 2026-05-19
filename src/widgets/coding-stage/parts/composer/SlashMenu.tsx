import { Slash } from 'lucide-react';

// Slash command menu. Pops above the textarea when the input starts with
// `/`. Mutually exclusive with the mention picker (the parent renders
// only one at a time). Extracted verbatim from Composer.tsx — the JSX,
// classNames and inline styles are byte-for-byte identical.
export function SlashMenu({
  slashFiltered, slashIndex, setSlashIndex, onChange, isDark, textMuted, focusTextarea,
}: {
  slashFiltered: { cmd: string; desc: string }[];
  slashIndex: number;
  setSlashIndex: (i: number) => void;
  onChange: (v: string) => void;
  isDark: boolean;
  textMuted: string;
  focusTextarea: () => void;
}) {
  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl border shadow-2xl overflow-hidden border-[color:var(--border-default)] bg-[var(--bg-elevated)]"
      style={isDark ? {
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      } : undefined}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] text-[color:var(--fg-subtle)] bg-[color:var(--bg-surface-muted)]">
        <Slash className="inline w-2.5 h-2.5 mr-1" />
        slash commands
      </div>
      <div className="divide-y divide-[color:var(--border-muted)]">
        {slashFiltered.map((c, i) => {
          const active = i === slashIndex;
          return (
            <button type="button"
              key={c.cmd}
              onMouseEnter={() => { setSlashIndex(i); }}
              onClick={() => {
                onChange(c.cmd + ' ');
                focusTextarea();
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                active
                  ? 'bg-[color:var(--bg-elevated)]'
                  : 'hover:bg-[color:var(--bg-surface-muted)]'
              }`}
            >
              <span
                style={{ color: 'var(--intent-success-fg)' }}
                className="font-mono text-[12px] font-semibold"
              >
                {c.cmd}
              </span>
              <span className={`text-[11px] ${textMuted}`}>{c.desc}</span>
              {active && (
                <span className="ml-auto text-[9px] font-mono text-[color:var(--fg-subtle)]">
                  ↵
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
