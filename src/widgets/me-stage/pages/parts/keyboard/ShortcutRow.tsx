import { useTranslation } from 'react-i18next';
import { Keyboard, RotateCcw } from 'lucide-react';
import { Button } from '@shared/ui/forms';
import type { Shortcut } from './types';
import { KeyChip } from './KeyChip';

export function ShortcutRow({
  shortcut, top, conflict, onEdit, onReset,
}: {
  shortcut: Shortcut;
  top: boolean;
  conflict: boolean;
  onEdit: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation('me');
  const customized = shortcut.current !== shortcut.defaultKey;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        background: 'var(--bg-canvas)',
        borderTop: top ? 'none' : '1px solid var(--border-muted)',
      }}
    >
      <Keyboard className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-subtle)' }} />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-base font-medium" style={{ color: 'var(--fg-strong)' }}>
          {shortcut.label}
        </span>
        {shortcut.description && (
          <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
            {shortcut.description}
          </span>
        )}
      </div>
      <KeyChip combo={shortcut.current} conflict={conflict} customized={customized} />
      <div className="flex items-center gap-1.5">
        <Button onClick={onEdit}>{t('keyboard.row.recordNew')}</Button>
        <Button variant="ghost" onClick={onReset} disabled={!customized} aria-label={t('keyboard.row.reset')}>
          <RotateCcw className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
