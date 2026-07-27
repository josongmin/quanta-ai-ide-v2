import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { IconButton } from '@shared/ui';
import type { InvestigationTarget } from '@entities/investigation';

export function PanelHeader({
  activeTarget,
  onClear,
  onClose,
}: {
  activeTarget: InvestigationTarget | null;
  onClear: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('investigation');
  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0"
      style={{
        height: 40,
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <Sparkles
        className="w-4 h-4 shrink-0"
        style={{ color: 'var(--intent-success-vivid)' }}
      />
      <span
        className="font-mono font-bold text-base shrink-0"
        style={{ color: 'var(--fg-default)' }}
      >
        {t('header.title')}
      </span>
      <div className="flex-1 min-w-0 flex flex-col items-start ml-2">
        {activeTarget ? (
          <>
            <span
              className="block truncate text-sm font-semibold w-full"
              style={{ color: 'var(--fg-default)' }}
            >
              {activeTarget.label}
            </span>
            {activeTarget.subtitle && (
              <span
                className="block truncate text-xs w-full"
                style={{ color: 'var(--fg-subtle)' }}
              >
                {activeTarget.subtitle}
              </span>
            )}
          </>
        ) : null}
      </div>
      {activeTarget ? (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-mono uppercase tracking-[0.12em] px-1.5 py-1 rounded-md transition-colors hover:[background:var(--bg-hover)]"
          style={{
            background: 'transparent',
            color: 'var(--fg-subtle)',
            cursor: 'pointer',
          }}
          title={t('header.resetTitle')}
        >
          {t('header.reset')}
        </button>
      ) : null}
      <IconButton icon={X} label={t('header.close')} size="sm" onClick={onClose} />
    </div>
  );
}
