import type { TFunction } from 'i18next';
import type { DiffHunk, PartialAcceptance } from '@entities/fix-pipeline';
import { GlassCard, SectionHeader } from '@shared/ui';

type Props = {
  diff: DiffHunk[];
  acceptance: PartialAcceptance | null;
  onToggle: (hunkIndex: number) => void;
  t: TFunction;
};

// Partial-accept controls — Phase 3. Per-hunk checkboxes that re-plan
// the residual radius. Lets the user accept only what they're sure of
// without forcing all-or-nothing on the whole patch.
export function PartialAcceptControls({ diff, acceptance, onToggle, t }: Props) {
  const accepted = new Set(acceptance?.acceptedHunkIndices ?? []);
  const total = diff.length;
  return (
    <GlassCard className="rounded-lg p-3">
      <SectionHeader
        title={t('partial.header')}
        badge={`${accepted.size.toString()}/${total.toString()}`}
      />

      <ul className="flex flex-col gap-1 mt-2">
        {diff.map((hunk, i) => {
          const isAccepted = accepted.has(i);
          return (
            <li key={`${hunk.file}-${i.toString()}`}>
              <button
                type="button"
                onClick={() => { onToggle(i); }}
                className="w-full text-left rounded-md px-2 py-1.5 transition-colors"
                style={{
                  background: isAccepted ? 'var(--bg-active)' : 'var(--bg-surface-muted)',
                  border: '1px solid',
                  borderColor: isAccepted ? 'var(--border-default)' : 'var(--border-muted)',
                  color: 'var(--fg-default)',
                }}
              >
                <span className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
                  [{isAccepted ? '✓' : ' '}]
                </span>{' '}
                <span className="text-sm">{hunk.file}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {acceptance && (
        <div
          className="mt-2 rounded-md px-2 py-1.5 text-xs"
          style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-muted)' }}
        >
          {t('partial.residual', {
            taint: acceptance.residual.before.taintPaths,
            blast: acceptance.residual.before.blastModules,
            hot: acceptance.residual.before.hotspotScore,
          })}
        </div>
      )}
    </GlassCard>
  );
}
