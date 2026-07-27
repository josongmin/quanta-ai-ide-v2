// ─────────────────────────────────────────────────────────────────────────
// Social field — icon + prefix + input

import { useTranslation } from 'react-i18next';

export function SocialField({
  icon, prefix, value, onChange,
}: { icon: React.ReactNode; prefix: string; value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('me');
  return (
    <div
      className="flex items-center h-9 rounded-md transition-colors"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span className="px-3 flex items-center gap-2 border-r"
        style={{ borderColor: 'var(--border-muted)', color: 'var(--fg-muted)' }}
      >
        {icon}
        <span className="text-base font-mono">{prefix}</span>
      </span>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder={t('profile.social.placeholder')}
        className="flex-1 bg-transparent outline-none px-3 text-base tabular-nums"
        style={{ color: 'var(--fg-strong)' }}
      />
    </div>
  );
}
