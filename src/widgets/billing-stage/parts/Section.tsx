import type { ReactNode } from 'react';

type Props = {
  anchor: string;
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function Section({ anchor, title, hint, right, children }: Props) {
  return (
    <section id={anchor} className="py-10 first:pt-0 scroll-mt-12">
      <header className="flex items-end justify-between gap-6 mb-6">
        <div className="flex flex-col gap-1 min-w-0">
          <h2
            className="text-[15px] font-semibold tracking-tight leading-none"
            style={{ color: 'var(--fg-strong)' }}
          >
            {title}
          </h2>
          {hint && (
            <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-subtle)' }}>
              {hint}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      {children}
    </section>
  );
}

// Hairline. The whole page is built around these — they replace boxed cards
// for section separation. Single 1px line, muted token, no shadow.
export function Divider() {
  return (
    <div
      aria-hidden
      className="h-px w-full"
      style={{ background: 'var(--border-muted)' }}
    />
  );
}
