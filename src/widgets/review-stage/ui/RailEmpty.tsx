// Right-rail empty state — shown when no PR is selected.
import { useTranslation } from '@shared/i18n';

export default function RailEmpty() {
  const { t } = useTranslation('app');
  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          {t('review.rail.prContext')}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center text-[11px] text-white/40">
        {t('review.rail.nothingSelected')}
      </div>
    </>
  );
}
