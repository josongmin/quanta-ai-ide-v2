import { X } from 'lucide-react';
import { useTranslation, SUPPORTED_LOCALES, type Locale } from '@shared/i18n';
import { CATEGORIES, FACETS } from '@entities/facet';
import { usePrefs, type Plan } from '../model/PrefsContext';
import { SegmentedToggle } from './parts/SegmentedToggle';
import { SettingsSection } from './parts/SettingsSection';
import { FacetTile } from './parts/FacetTile';

function isLocale(v: string | undefined): v is Locale {
  return typeof v === 'string'
    && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}
function toLocale(v: string | undefined): Locale {
  return isLocale(v) ? v : 'en';
}

// Settings dialog body. Split out from SettingsPanel.tsx so the panel can
// lazy-load this chunk only when the modal opens — keeps FACET/CATEGORIES
// data and the parts/* tiles out of the initial bundle.
export default function SettingsBody({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('prefs');
  const prefs = usePrefs();
  const currentLang = toLocale(i18n.resolvedLanguage);

  return (
    <div className="flex flex-col min-h-0">
      <header
        className="shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="min-w-0">
          <h2
            id="settings-title"
            className="text-[15px] font-black uppercase tracking-eyebrow"
            style={{ color: 'var(--fg-strong)' }}
          >
            {t('title')}
          </h2>
          <p
            id="settings-subtitle"
            className="text-sm mt-1"
            style={{ color: 'var(--fg-subtle)' }}
          >
            {t('subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeAria')}
          className="shrink-0 p-1.5 -m-1.5 rounded-md transition-colors hover-surface"
          style={{ color: 'var(--fg-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 scrollbar-thin">
        <div className="settings-section-in space-y-1 divide-y" style={{ borderColor: 'var(--border-muted)' }}>
          <SettingsSection label={t('plan.heading')} inline>
            <SegmentedToggle<Plan>
              ariaLabel={t('plan.heading')}
              value={prefs.plan}
              onChange={(v) => { prefs.setPlan(v); }}
              options={[
                { value: 'free', label: t('plan.free') },
                { value: 'pro', label: t('plan.pro') },
                { value: 'enterprise', label: t('plan.enterprise') },
              ]}
            />
          </SettingsSection>

          <SettingsSection label={t('language.title')} inline>
            <SegmentedToggle<Locale>
              ariaLabel={t('language.title')}
              value={currentLang}
              onChange={(v) => { void i18n.changeLanguage(v); }}
              options={SUPPORTED_LOCALES.map((lng) => ({
                value: lng,
                label: t(`language.${lng}`),
              }))}
            />
          </SettingsSection>
        </div>

        <div className="mt-6 space-y-5">
          {CATEGORIES.map((cat, ci) => {
            const fs = FACETS.filter((f) => f.category === cat.key);
            if (fs.length === 0) return null;
            return (
              <SettingsSection key={cat.key} label={cat.label}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {fs.map((f, fi) => (
                    <FacetTile
                      key={f.key}
                      facet={f}
                      unlocked={prefs.isUnlocked(f)}
                      hidden={prefs.hidden.has(f.key)}
                      onToggle={() => { prefs.toggleHidden(f.key); }}
                      delayMs={ci * 40 + fi * 18}
                    />
                  ))}
                </div>
              </SettingsSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
