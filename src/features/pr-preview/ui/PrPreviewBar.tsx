import { useMemo } from 'react';
import { GitPullRequest, Plus, Pencil, Minus, Shuffle, X } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { GlassCard } from '@shared/ui';
import { usePrPreview } from '../model/usePrPreview';
import type { PRChangeKind } from '@entities/repo';

const KIND_COLOR: Record<PRChangeKind, string> = {
  added:    '#5fa86c',
  modified: '#a8893a',
  deleted:  '#c25a55',
};

type CountTriple = Record<PRChangeKind, number>;

export default function PrPreviewBar() {
  const { isDark } = useTheme();
  const { t } = useTranslation('diff');
  const { active, diff, seed, start, stop, regenerate } = usePrPreview();

  // Tally per-kind counts once. We intentionally walk the array instead of
  // filtering three times — the diff is small but this stays O(N).
  const counts = useMemo<CountTriple>(() => {
    const c: CountTriple = { added: 0, modified: 0, deleted: 0 };
    if (!diff) return c;
    for (const ch of diff.changes) c[ch.kind]++;
    return c;
  }, [diff]);

  if (!active || !diff) {
    return (
      <GlassCard className="p-2">
        <button
          type="button"
          onClick={start}
          aria-label={t('preview.openLabel')}
          title={t('preview.openTitle')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('preview.openLabel')}</span>
        </button>
      </GlassCard>
    );
  }

  const filesChanged = diff.changes.length;
  const ripple = diff.affected.length;

  return (
    <GlassCard className="p-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-1">
          <GitPullRequest
            className={`w-3.5 h-3.5 ${isDark ? 'text-white/70' : 'text-black/70'}`}
            aria-hidden="true"
          />
          <span
            className={`text-[10px] font-black uppercase tracking-[0.18em] ${
              isDark ? 'text-white/85' : 'text-black/85'
            }`}
          >
            {filesChanged} files changed
          </span>
          <span
            className={`text-[10px] font-mono ${
              isDark ? 'text-white/40' : 'text-black/40'
            }`}
          >
            ·
          </span>
          <span
            className={`text-[10px] font-bold tabular-nums ${
              isDark ? 'text-white/55' : 'text-black/55'
            }`}
          >
            {ripple} ripple
          </span>
          {seed !== null && (
            <span
              className={`ml-1 text-[9px] font-mono px-1 py-0.5 rounded-md ${
                isDark ? 'bg-white/5 text-white/40' : 'bg-black/5 text-black/40'
              }`}
              title={`seed ${seed}`}
            >
              #{seed}
            </span>
          )}
        </div>

        <div
          className={`h-3 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`}
          aria-hidden="true"
        />

        <div className="flex items-center gap-1" role="group" aria-label={t('preview.changeCountsAria')}>
          <KindBadge isDark={isDark} kind="added"    icon={Plus}   value={counts.added} />
          <KindBadge isDark={isDark} kind="modified" icon={Pencil} value={counts.modified} />
          <KindBadge isDark={isDark} kind="deleted"  icon={Minus}  value={counts.deleted} />
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={regenerate}
          aria-label={t('preview.regenerateAria')}
          title={t('preview.regenerateTitle')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
            isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('preview.regenerate')}</span>
        </button>
        <button
          type="button"
          onClick={stop}
          aria-label={t('preview.closeAria')}
          title={t('preview.closeTitle')}
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
            isDark ? 'text-white/55 hover:bg-white/5 hover:text-white/85' : 'text-black/55 hover:bg-black/5 hover:text-black/85'
          }`}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  );
}

function KindBadge({
  isDark, kind, icon: Icon, value,
}: {
  isDark: boolean;
  kind: PRChangeKind;
  icon: typeof Plus;
  value: number;
}) {
  const color = KIND_COLOR[kind];
  const dim = value === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] tabular-nums ${
        isDark ? 'bg-white/[0.04]' : 'bg-black/[0.04]'
      } ${dim ? 'opacity-40' : ''}`}
      style={{ color }}
      aria-label={`${kind} ${value}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {value}
    </span>
  );
}
