import type { TFunction } from 'i18next';
import type { DiffHunk } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  diff: DiffHunk[];
  t: TFunction;
};

// Diff is rendered last on purpose. The spec calls this "proof-first" —
// patch lives below root-cause + obligations so reviewers don't anchor on
// surface changes before reading the evidence.
export function DiffPane({ diff, t }: Props) {
  return (
    <GlassCard className="rounded-lg p-4">
      <SectionHeader title={t('diff.header')} badge={t('diff.subtitle')} />
      <div className="flex flex-col gap-3 mt-2">
        {diff.map((hunk, i) => (
          <div key={`${hunk.file}-${i.toString()}`}>
            <div
              className="text-[10px] font-mono mb-1 px-1"
              style={{ color: 'var(--fg-muted)' }}
            >
              {hunk.file}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <pre
                className="text-[10px] font-mono leading-relaxed rounded-md p-2 overflow-auto"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <code>{hunk.before}</code>
              </pre>
              <pre
                className="text-[10px] font-mono leading-relaxed rounded-md p-2 overflow-auto"
                style={{
                  background: 'var(--bg-surface-muted)',
                  color: 'var(--fg-default)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <code>{hunk.after}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
