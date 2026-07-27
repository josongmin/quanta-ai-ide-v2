import { useTranslation } from 'react-i18next';

export function ShortcutsHint() {
  const { t } = useTranslation('investigation');
  return (
    <span
      className="font-mono truncate"
      style={{
        fontSize: 9,
        color: 'var(--fg-subtle)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}
      aria-hidden="true"
    >
      {t('shortcuts.hint')}
    </span>
  );
}
