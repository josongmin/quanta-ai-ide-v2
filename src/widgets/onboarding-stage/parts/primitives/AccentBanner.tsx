import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ACCENT_TINT } from './shared';

// Accent-tinted info panel shared by the "recognized org" callout and the
// enterprise plan summary: an icon on the left, a bold title + muted body on
// the right, on an fg-accent-tinted card. Markup is byte-identical to the
// inlined originals; the `stagger` flag toggles the entrance animation that
// only the org variant carried.
type Props = {
  icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
  stagger?: boolean;
};

export function AccentBanner({ icon: Icon, title, body, stagger = false }: Props) {
  return (
    <div
      className={`flex items-start gap-3 px-3 py-3 rounded-md${stagger ? ' onb-stagger' : ''}`}
      style={{ background: ACCENT_TINT, border: '1px solid var(--fg-accent)' }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--fg-accent)' }} />
      <div className="flex flex-col gap-0.5 text-sm leading-snug">
        <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>
          {title}
        </span>
        <span style={{ color: 'var(--fg-muted)' }}>
          {body}
        </span>
      </div>
    </div>
  );
}
