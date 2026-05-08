// Right-pane empty state — shown when no PR is selected.
import { GitPullRequest } from 'lucide-react';
import { useTranslation } from '@shared/i18n';

export default function EmptyState() {
  const { t } = useTranslation('app');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <GitPullRequest className="w-8 h-8 text-white/30" />
      <div className="text-[13px] font-bold text-white/70">{t('review.empty.noPrTitle')}</div>
      <div className="text-[11px] max-w-[320px] text-white/40">
        {t('review.empty.noPrSubtitle')}
      </div>
    </div>
  );
}
