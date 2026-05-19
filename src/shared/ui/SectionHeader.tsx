import type { ReactNode } from 'react';
import { Badge } from './Badge';

// Standardised section header: uppercase eyebrow title with an optional
// subtitle and an optional right-side slot (badge string or arbitrary
// actions/children).
//
// Unifies the two pre-existing variants:
//   • GlassCard's   { title, badge }            — eyebrow + right-aligned chip
//   • focus-scan's  { title, sub }              — eyebrow + muted subtitle
// so a single implementation can back both call sites.
//
// `badge` takes a plain string and renders through the shared <Badge>.
// `actions`/`children` cover the general right-side slot. When any right-side
// content is present the row lays out as space-between; otherwise it's a
// simple stacked title + subtitle block.
type Props = {
  title: string;
  /** Muted secondary line under the title. */
  sub?: string;
  /** Convenience right-side chip (neutral). For richer content use actions. */
  badge?: string;
  /** Arbitrary right-side slot (buttons, custom chips, etc.). */
  actions?: ReactNode;
  children?: ReactNode;
};

export function SectionHeader({ title, sub, badge, actions, children }: Props) {
  const right = actions ?? children ?? (badge != null ? <Badge size="sm">{badge}</Badge> : null);

  const titleBlock = (
    <div>
      <h3
        className="text-[10px] font-black uppercase tracking-[var(--track-eyebrow)]"
        style={{ color: 'var(--fg-muted)' }}
      >
        {title}
      </h3>
      {sub && (
        <div
          className="text-[9px] mt-0.5"
          style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
        >
          {sub}
        </div>
      )}
    </div>
  );

  if (!right) {
    return <div className="mb-1.5 px-0.5">{titleBlock}</div>;
  }

  return (
    <div className="flex items-center justify-between mb-1.5 px-0.5">
      {titleBlock}
      {right}
    </div>
  );
}
