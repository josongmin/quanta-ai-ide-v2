// Footer hints under the center spine. Sparkle on the right hand side
// is purely decorative (telegraphs "AI surface").
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';

export default function FooterHints() {
  const { t } = useTranslation('app');
  return (
    <div className="flex items-center justify-between gap-3 mt-2 px-1 py-3 text-[10px] font-mono text-white/30 border-t border-white/[0.04]">
      <span>{t('review.footer.left')}</span>
      <span className="flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {t('review.footer.right')}
      </span>
    </div>
  );
}
