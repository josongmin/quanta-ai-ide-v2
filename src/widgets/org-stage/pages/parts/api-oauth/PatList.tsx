import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { Pat } from './types';

// NOTE: kept hand-rolled (not DataTable): the header strip has NO
// `--bg-surface-muted` background — DataTable always paints the header with it,
// so migrating would add a fill that isn't here. (The h-14 rows and kept
// first-row border are now expressible via DataTable's rowHeight/firstRowBorder
// props, but the header-bg mismatch alone blocks migration.)
export function PatList({ pats, onDelete }: { pats: Pat[]; onDelete: (p: Pat) => void }) {
  const { t } = useTranslation('org');
  if (pats.length === 0) {
    return (
      <div className="text-center py-12 text-base" style={{ color: 'var(--fg-subtle)' }}>
        {t('api.pat.empty')}
      </div>
    );
  }
  return (
    <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-muted)' }}>
      <div
        className="grid items-center px-3 h-9 text-xs uppercase tracking-eyebrow font-semibold"
        style={{
          gridTemplateColumns: '1fr 200px 110px 100px 32px',
          gap: 12,
          color: 'var(--fg-subtle)',
          borderBottom: '1px solid var(--border-muted)',
        }}
      >
        <span>{t('api.pat.token')}</span>
        <span>{t('api.pat.scopes')}</span>
        <span>{t('api.pat.expires')}</span>
        <span>{t('api.pat.lastUsed')}</span>
        <span />
      </div>
      {pats.map((p) => {
        const expired = p.expiresAt && p.expiresAt < '2026-05-11';
        return (
          <div
            key={p.id}
            role="presentation"
            className="grid items-center px-3 h-14 text-base transition-colors"
            style={{
              gridTemplateColumns: '1fr 200px 110px 100px 32px',
              gap: 12,
              borderTop: '1px solid var(--border-muted)',
              opacity: expired ? 0.55 : 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex flex-col min-w-0 gap-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-medium truncate" style={{ color: 'var(--fg-strong)' }}>{p.name}</span>
                {expired && (
                  <span className="text-2xs uppercase tracking-eyebrow font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--intent-danger-bg)', color: 'var(--intent-danger-fg)', border: '1px solid var(--intent-danger-fg)' }}>
                    {t('api.pat.expired')}
                  </span>
                )}
              </div>
              <span className="font-mono text-xs truncate" style={{ color: 'var(--fg-subtle)' }}>
                {t('api.pat.createdBy', { prefix: p.prefix, by: p.createdBy, date: p.createdAt })}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 min-w-0">
              {p.scopes.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="text-xs font-mono px-1.5 py-0.5 rounded truncate"
                  style={{ background: 'var(--bg-surface-muted)', color: 'var(--fg-default)', border: '1px solid var(--border-muted)' }}
                >
                  {s}
                </span>
              ))}
              {p.scopes.length > 2 && (
                <span className="text-xs tabular-nums" style={{ color: 'var(--fg-subtle)' }}>
                  +{p.scopes.length - 2}
                </span>
              )}
            </div>
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              {p.expiresAt ?? t('api.pat.never')}
            </span>
            <span className="text-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>
              {p.lastUsed}
            </span>
            <button
              type="button"
              onClick={() => { onDelete(p); }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center"
              style={{ color: 'var(--fg-subtle)' }}
              aria-label={t('api.pat.revoke')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
