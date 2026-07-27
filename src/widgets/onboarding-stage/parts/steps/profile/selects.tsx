import { Trans, useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { TIMEZONES, LOCALES } from '../../../lib/timezones';

// Timezone & locale selects — searchable native selects with "detected" hint.
export function TimezoneSelect({
  value, onChange, detected,
}: { value: string; onChange: (v: string) => void; detected: string }) {
  const { t } = useTranslation('onboarding');
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-eyebrow font-medium flex items-center justify-between"
        style={{ color: 'var(--fg-subtle)' }}>
        <span>{t('profile.timezone')}</span>
        {value === detected && (
          <span className="lowercase tracking-normal" style={{ color: 'var(--fg-accent)' }}>
            {t('profile.detected')}
          </span>
        )}
      </span>
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        className="h-9 rounded-md px-3 text-base outline-none"
        style={{
          background: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-default)',
          color: 'var(--fg-strong)',
        }}
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.id} value={tz.id}>
            {tz.label} · {tz.offset}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LocaleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('onboarding');
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-eyebrow font-medium" style={{ color: 'var(--fg-subtle)' }}>
        {t('profile.language')}
      </span>
      <div className="relative">
        <Globe
          className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--fg-subtle)' }}
        />
        <select
          value={value}
          onChange={(e) => { onChange(e.target.value); }}
          className="w-full h-9 rounded-md pl-7 pr-3 text-base outline-none appearance-none"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          {LOCALES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label} · {l.native}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export function DetectionBanner({ detectedTz, detectedLoc }: { detectedTz: string; detectedLoc: string }) {
  const { t } = useTranslation('onboarding');
  return (
    <div
      className="flex items-start gap-2 text-xs leading-snug px-2.5 py-2 rounded-md"
      style={{
        background: 'var(--bg-surface-muted)',
        border: '1px dashed var(--border-default)',
        color: 'var(--fg-subtle)',
      }}
    >
      <Globe className="w-3 h-3 mt-0.5 shrink-0" />
      <span>
        <Trans
          i18nKey="profile.detectionBanner"
          t={t}
          values={{ tz: detectedTz, loc: detectedLoc }}
          components={[
            <span key="0" className="font-mono" style={{ color: 'var(--fg-default)' }} />,
            <span key="1" className="font-mono" style={{ color: 'var(--fg-default)' }} />,
          ]}
        />
      </span>
    </div>
  );
}
