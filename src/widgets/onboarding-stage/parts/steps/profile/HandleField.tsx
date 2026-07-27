import { useTranslation } from 'react-i18next';
import { Check, Loader2, X } from 'lucide-react';
import type { useAvailability } from '../../../lib/availability';

// Handle field — wraps an availability indicator inline.
export function HandleField({
  value, onChange, check,
}: {
  value: string;
  onChange: (v: string) => void;
  check: ReturnType<typeof useAvailability>;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}
      >
        <span>{t('profile.handle')}</span>
        <span style={{ color: messageColor(check.state) }}>
          {check.message}
        </span>
      </span>
      <div
        className="flex items-center h-9 rounded-md transition-colors"
        style={{
          background: 'var(--bg-surface-muted)',
          border: `1px solid ${
            check.state === 'taken' || check.state === 'invalid' ? 'var(--intent-danger-fg)'
            : check.state === 'available' ? 'var(--intent-success-fg)'
            : 'var(--border-default)'
          }`,
        }}
      >
        <span className="pl-3 text-base" style={{ color: 'var(--fg-subtle)' }}>@</span>
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32)); }}
          placeholder={t('profile.handlePlaceholder')}
          required
          className="flex-1 bg-transparent outline-none px-1 text-base tabular-nums"
          style={{ color: 'var(--fg-strong)' }}
        />
        <div className="pr-2.5">
          {check.state === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--fg-muted)' }} />}
          {check.state === 'available' && <Check className="w-3.5 h-3.5 onb-tick" style={{ color: 'var(--intent-success-fg)' }} />}
          {(check.state === 'taken' || check.state === 'invalid') && <X className="w-3.5 h-3.5" style={{ color: 'var(--intent-danger-fg)' }} />}
        </div>
      </div>
    </label>
  );
}

function messageColor(state: ReturnType<typeof useAvailability>['state']) {
  if (state === 'available') return 'var(--intent-success-fg)';
  if (state === 'taken' || state === 'invalid') return 'var(--intent-danger-fg)';
  if (state === 'checking') return 'var(--fg-muted)';
  return 'var(--fg-subtle)';
}
