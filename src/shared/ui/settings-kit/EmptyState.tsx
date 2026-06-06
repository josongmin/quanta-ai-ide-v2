import { Search } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

// Centered empty state for the settings/admin tables (9+ sites). Distinct from
// the existing inline <EmptyHint> (a single italic line) — this is the larger
// centered icon + title + subtext block used inside DataTable bodies.
//
// Reproduces the LabelsPage / MembersPage `EmptyRow`: a column-centered stack,
// `py-12 px-4`, a w-5 h-5 --fg-subtle icon (magnifier by default), a 12px
// semibold --fg-strong title, and an 11px --fg-subtle subtitle.

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Leading icon. Defaults to a search magnifier. */
  icon?: ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

export function EmptyState({ title, subtitle, icon: Icon = Search }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <Icon className="w-5 h-5" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {title}
      </span>
      {subtitle && (
        <span className="text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
