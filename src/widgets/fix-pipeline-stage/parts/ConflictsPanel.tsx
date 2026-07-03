import type { TFunction } from 'i18next';
import type { OpenPrConflict } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  conflicts: OpenPrConflict[];
  t: TFunction;
};

// Open-PR conflict — surfaces overlapping in-flight work that would
// silently collide with this candidate's diff. Hidden when none exist;
// loud when they do.
export function ConflictsPanel({ conflicts, t }: Props) {
  if (conflicts.length === 0) return null;
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader title={t('conflicts.header')} badge={conflicts.length.toString()} />
      <ul className="flex flex-col gap-1.5 mt-1">
        {conflicts.map((c) => (
          <li
            key={c.prNumber}
            className="rounded-md px-2 py-1.5"
            style={{
              background: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--fg-default)' }}>
              #{c.prNumber.toString()} · {c.title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
              {c.author} · {c.overlappingFiles.join(', ')}
            </div>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
