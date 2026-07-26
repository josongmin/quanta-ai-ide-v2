import { useMemo } from 'react';
import { useTranslation } from '@shared/i18n';
import { Modal } from '@shared/ui';
import { isMacOS } from '@shared/lib';

// Help modal listing every global shortcut wired by AppShell + SearchBar.
// Source-of-truth for the rendered shortcut list lives here so a single
// place is updated when bindings change.

type Props = {
  open: boolean;
  onClose: () => void;
};

type Row = {
  actionKey: string;   // i18n key under help.action.*
  keys: string[];      // display chunks composed via the `+` separator
};

export default function ShortcutsModal({ open, onClose }: Props) {
  const { t } = useTranslation('help');
  const mod = useMemo(() => (isMacOS() ? '⌘' : 'Ctrl'), []);

  const rows: Row[] = useMemo(() => [
    { actionKey: 'focusSearch',  keys: [mod, 'K'] },
    { actionKey: 'openSettings', keys: [mod, ','] },
    { actionKey: 'openActivity', keys: [mod, 'Shift', 'A'] },
    { actionKey: 'toggleHelp',   keys: [mod, '/'] },
    { actionKey: 'closeOrBlur',  keys: ['Esc'] },
    { actionKey: 'focusSearchSlash', keys: ['/'] },
  ], [mod]);

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t('title')} width={520}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-wide">
            {t('title')}
          </h2>
          <span
            className="text-xs font-mono opacity-50"
            aria-hidden
          >
            {mod} /
          </span>
        </div>

        <table className="w-full text-base">
          <thead>
            <tr className="text-2xs font-black uppercase tracking-eyebrow opacity-50">
              <th className="text-left pb-2">{t('column.action')}</th>
              <th className="text-right pb-2">{t('column.shortcut')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.actionKey} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                <td className="py-2 pr-4">{t(`action.${r.actionKey}`)}</td>
                <td className="py-2 text-right">
                  {r.keys.map((k, i) => (
                    <span key={`${r.actionKey}-${String(i)}`} className="inline-flex items-center">
                      {i > 0 && <span className="mx-1 opacity-40">+</span>}
                      <kbd
                        className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md text-xs font-mono font-bold"
                        style={{
                          background: 'var(--bg-muted, rgba(127,127,127,0.12))',
                          border: '1px solid var(--border-default)',
                        }}
                      >
                        {k}
                      </kbd>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-4 text-sm opacity-60">
          {t('hint')}
        </p>
      </div>
    </Modal>
  );
}
