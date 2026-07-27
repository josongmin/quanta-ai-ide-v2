import { RotateCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RowMenu } from '@shared/ui';

import type { Secret } from './types';

export function SecretRow({
  secret, onRotate, onDelete,
}: { secret: Secret; onRotate: () => void; onDelete: () => void }) {
  const { t } = useTranslation('ws');
  return (
    <div
      role="row"
      className="grid items-center px-3 h-12 text-base transition-colors"
      style={{
        gridTemplateColumns: '1fr 220px 110px 100px 32px',
        gap: 12,
        borderTop: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span
        className="font-mono uppercase truncate font-medium"
        style={{ color: 'var(--fg-strong)' }}
      >
        {secret.name}
      </span>
      <div className="flex flex-wrap gap-1">
        {secret.scopes.map((sc) => (
          <span
            key={sc}
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-surface-muted)',
              color: 'var(--fg-default)',
              border: '1px solid var(--border-muted)',
            }}
          >
            {sc}
          </span>
        ))}
      </div>
      <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {secret.lastRotated}
      </span>
      <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
        {secret.lastAccessed}
      </span>
      <RowMenu
        itemPadding="wide"
        triggerColor="var(--fg-subtle)"
        items={[
          { icon: RotateCw, label: t('secrets.row.rotate'), onClick: onRotate },
          { icon: ShieldCheck, label: t('secrets.row.viewScopes') },
          { icon: Trash2, label: t('secrets.row.delete'), onClick: onDelete, danger: true },
        ]}
      />
    </div>
  );
}
