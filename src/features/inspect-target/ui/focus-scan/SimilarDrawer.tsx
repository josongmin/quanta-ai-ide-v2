import { useMemo } from 'react';
import { useFilterRepo } from '@entities/filter-state';
import { findSimilar, type FileRecord, type SimilarHit } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { useStack } from '../../model/StackContext';
import { Empty } from './shared';

// ─── SIMILAR drawer (header action, not a tab) ────────────────────────
//
// Opens from the Sparkles button in the FocusScanPanel header. Surfaces the
// `findSimilar` results for the current file as a clickable list that pushes
// each hit onto the stack via `useStack`.

export function SimilarDrawer({ file, onClose }: { file: FileRecord; onClose: () => void }) {
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');
  const { open: openStack } = useStack();
  const hits = useMemo<SimilarHit[]>(() => findSimilar(repo, file.id, 6), [repo, file.id]);
  return (
    <div
      className="shrink-0 px-4 py-3 border-b"
      style={{
        borderColor: 'var(--border-default)',
        background: 'var(--bg-surface-muted)',
      }}
    >
      <div
        className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] mb-1.5 flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('catalog.openSimilar')}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[9px] font-mono"
          style={{ color: 'var(--fg-subtle)', opacity: 0.7 }}
        >
          esc
        </button>
      </div>
      <p className="text-[10px] mb-2" style={{ color: 'var(--fg-muted)' }}>
        {t('focus.similarHint', { name: file.name })}
      </p>
      {hits.length === 0 ? (
        <Empty>{t('focus.similarEmpty')}</Empty>
      ) : (
        <div className="space-y-1">
          {hits.map((hit) => {
            const f = repo.files[hit.id];
            if (!f) return null;
            const pct = Math.max(0, Math.min(1, hit.score));
            return (
              <button
                key={hit.id}
                type="button"
                onClick={() => { openStack({ kind: 'file', id: hit.id }); }}
                className="w-full text-left px-2 py-1.5 rounded-md text-[10px] transition-colors hover-surface"
                style={{ background: 'var(--bg-surface-muted)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono truncate">{f.name}</div>
                    <div
                      className="font-mono truncate text-[9px]"
                      style={{ color: 'var(--fg-subtle)' }}
                    >
                      {f.folderPath}
                    </div>
                  </div>
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded-md font-mono text-[9px] tabular-nums"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--fg-muted)' }}
                  >
                    {Math.round(pct * 100)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
