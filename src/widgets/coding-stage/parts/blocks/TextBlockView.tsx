import type { TextBlock } from '../types';

// Tiny inline-code formatter: anything between backticks gets a chip.
export function TextBlockView({ block, isDark }: { block: TextBlock; isDark: boolean }) {
  void isDark;
  const color = 'text-[var(--fg-strong)]';
  const parts = block.text.split(/(`[^`]+`)/g);
  return (
    <div className={`text-[12px] leading-[1.65] ${color} whitespace-pre-wrap break-words`}>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code
            key={i}
            className={`mx-px px-1 py-px rounded-md text-[12px] font-mono bg-[var(--bg-elevated)] text-[var(--fg-accent)] border border-[var(--border-default)]`}
          >
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
}
