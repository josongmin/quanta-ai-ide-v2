import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import type { Filter } from './types';

export function EmptyHint({ q, filter }: { q: string; filter: Filter }) {
  const { t } = useTranslation('me');
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
      <Inbox className="w-6 h-6" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {q ? t('inbox.empty.noMatches', { query: q }) : t('inbox.empty.listClear', { filter: t(`inbox.filters.${filter}`).toLowerCase() })}
      </span>
      <span className="text-sm" style={{ color: 'var(--fg-subtle)' }}>
        {q ? t('inbox.empty.tryDifferent') : t('inbox.empty.nothingWaiting')}
      </span>
    </div>
  );
}

export function DetailEmpty() {
  const { t } = useTranslation('me');
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <Inbox className="w-7 h-7" style={{ color: 'var(--fg-subtle)' }} />
      <span className="text-base font-semibold" style={{ color: 'var(--fg-strong)' }}>
        {t('inbox.empty.detailTitle')}
      </span>
      <span className="text-sm max-w-[280px]" style={{ color: 'var(--fg-muted)' }}>
        {t('inbox.empty.detailBodyPrefix')}<kbd className="px-1 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>j</kbd>{t('inbox.empty.detailBodyMiddle')}<kbd className="px-1 rounded font-mono text-xs" style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)' }}>k</kbd>{t('inbox.empty.detailBodySuffix')}
      </span>
    </div>
  );
}
