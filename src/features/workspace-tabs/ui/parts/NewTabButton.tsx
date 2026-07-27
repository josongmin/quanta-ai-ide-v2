import { Plus } from 'lucide-react';
import { useTranslation } from '@shared/i18n';

type NewTabButtonProps = {
  onClick: () => void;
};

export function NewTabButton({ onClick }: NewTabButtonProps) {
  const { t } = useTranslation('app');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('workspaceTabs.openNewTab')}
      title={t('workspaceTabs.newTab')}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:[background:var(--bg-hover)]"
      style={{ color: 'var(--fg-subtle)', opacity: 0.82 }}
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  );
}
