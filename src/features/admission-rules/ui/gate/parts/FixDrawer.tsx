import { useTranslation } from 'react-i18next';
import { ModalShell } from './ModalShell';

// "Fix" drawer — shows a static stub diff for the rule. In production this is
// the seam where you'd POST to a fix-suggestion service; here the diff is a
// fixed sample so the demo renders deterministically.

const FAKE_FIX_DIFF: { before: string; after: string } = {
  before: `const row = await db.query(\`SELECT * FROM users WHERE id = '\${id}'\`);`,
  after:  `const row = await db.query('SELECT * FROM users WHERE id = ?', [id]);`,
};

export function FixDrawer({
  ruleName, onClose,
}: {
  ruleName: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('admission');
  return (
    <ModalShell title={t('gate.fix.title', { rule: ruleName })} onClose={onClose}>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px]" style={{ color: 'var(--fg-muted)' }}>
          {t('gate.fix.intro')}
        </p>
        <div
          className="rounded-md overflow-hidden font-mono text-[11px] leading-[1.55]"
          style={{ border: '1px solid var(--border-default)' }}
        >
          <div
            className="px-3 py-1 text-[10px] uppercase tracking-[0.14em]"
            style={{
              color: 'var(--fg-subtle)',
              background: 'var(--bg-surface-muted)',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {t('gate.fix.diffHeader')}
          </div>
          <div className="px-3 py-2" style={{ background: 'var(--bg-canvas)' }}>
            <div
              className="whitespace-pre"
              style={{
                color: 'var(--intent-danger-fg)',
                background: 'color-mix(in oklab, var(--intent-danger-fg) 7%, transparent)',
              }}
            >
              − {FAKE_FIX_DIFF.before}
            </div>
            <div
              className="whitespace-pre"
              style={{
                color: 'var(--intent-success-fg)',
                background: 'color-mix(in oklab, var(--intent-success-fg) 7%, transparent)',
              }}
            >
              + {FAKE_FIX_DIFF.after}
            </div>
          </div>
        </div>
        <p
          className="text-[11px] leading-snug"
          style={{ color: 'var(--fg-subtle)' }}
        >
          The agent&apos;s confidence in this patch is moderate — verify the
          parameterised query lands in your DB layer before merging.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 rounded-md text-[11px]"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--fg-muted)',
            }}
          >
            {t('gate.modal.close')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled
            title={t('gate.fix.applyDisabledTitle')}
            className="h-7 px-3 rounded-md text-[11px] font-medium"
            style={{
              background: 'var(--fg-strong)',
              color: 'var(--bg-canvas)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            {t('gate.fix.apply')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
