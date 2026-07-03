import type { TFunction } from 'i18next';
import type { Freshness } from '@entities/fix-pipeline';
import { describeFreshness } from '@entities/fix-pipeline';

type Props = {
  freshness: Freshness;
  t: TFunction;
};

// Index freshness — every confidence number on this page inherits the
// freshness of the underlying index. Surfacing it as a top banner is the
// minimum honesty bar; hiding it would let a stale-index demo claim
// confidence it can't back up.
export function FreshnessBanner({ freshness, t }: Props) {
  const tone = freshness.stale ? STALE : FRESH;
  return (
    <div
      className="px-3 py-1.5 text-sm flex items-center justify-between"
      style={{
        background: tone.bg,
        color: tone.fg,
        borderBottom: `1px solid ${tone.border}`,
      }}
    >
      <span className="font-bold uppercase tracking-eyebrow">
        {freshness.stale ? t('freshness.stale') : t('freshness.fresh')}
      </span>
      <span className="font-mono">
        {t('freshness.indexedAgo', { age: describeFreshness(freshness) })}
      </span>
    </div>
  );
}

const FRESH = {
  bg: 'var(--bg-surface-muted)',
  fg: 'var(--fg-muted)',
  border: 'var(--border-muted)',
};
const STALE = {
  bg: 'var(--bg-surface-muted)',
  fg: 'var(--fg-strong)',
  border: 'var(--fg-strong)',
};
