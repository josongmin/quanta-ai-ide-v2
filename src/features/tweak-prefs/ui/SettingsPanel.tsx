import { useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { useTranslation, SUPPORTED_LOCALES, type Locale } from '@shared/i18n';
import { CATEGORIES, FACETS } from '@entities/facet';
import { Modal } from '@shared/ui';
import { usePrefs, type Plan } from '../model/PrefsContext';
import { SegmentedToggle } from './parts/SegmentedToggle';
import { SettingsSection } from './parts/SettingsSection';
import { FacetTile } from './parts/FacetTile';

// Settings dialog. Trigger lives in two flavours (compact icon button used
// in the GNB, full-width button used inside other panels) but both open the
// same dialog body. Body is decomposed into:
//   • <SettingsSection> — uniform label/content slot
//   • <SegmentedToggle> — sliding-thumb radio group (Plan, Language)
//   • <FacetTile>       — per-facet visibility toggle with stagger-in
//
// The dialog itself uses the shared <Modal>, which now owns enter/exit
// transitions and proper sizing. The dialog box is capped at 720px wide so
// it stays a comfortable reading column on large displays.

function isLocale(v: string | undefined): v is Locale {
  return typeof v === 'string'
    && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}
function toLocale(v: string | undefined): Locale {
  return isLocale(v) ? v : 'en';
}

export default function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation('prefs');

  return (
    <>
      <SettingsTrigger compact={compact} onOpen={() => { setOpen(true); }} />
      <Modal
        open={open}
        onClose={() => { setOpen(false); }}
        width="100%"
        maxWidth={720}
        ariaLabelledBy="settings-title"
        ariaDescribedBy="settings-subtitle"
        align="top"
      >
        <SettingsBody onClose={() => { setOpen(false); }} t={t} />
      </Modal>
    </>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────

function SettingsTrigger({ compact, onOpen }: { compact: boolean; onOpen: () => void }) {
  const { t } = useTranslation('prefs');

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title={t('openTitle')}
        aria-label={t('openAria')}
        className="p-2 rounded-full transition-all active:scale-95 hover-surface"
        style={{
          color: 'var(--fg-muted)',
          background: 'transparent',
        }}
      >
        <Settings2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-colors hover-surface"
      style={{
        background: 'var(--bg-surface-muted, transparent)',
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      <Settings2 className="w-3.5 h-3.5" />
      {t('buttonLabel')}
    </button>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────

function SettingsBody({
  onClose, t,
}: {
  onClose: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const prefs = usePrefs();
  const { i18n } = useTranslation('prefs');
  const currentLang = toLocale(i18n.resolvedLanguage);

  return (
    <div className="flex flex-col min-h-0">
      {/* Header — fixed, doesn't scroll with the body. */}
      <header
        className="shrink-0 flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <div className="min-w-0">
          <h2
            id="settings-title"
            className="text-[15px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--fg-strong)' }}
          >
            {t('title')}
          </h2>
          <p
            id="settings-subtitle"
            className="text-[11px] mt-1"
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

      {/* Body — scrolls. */}
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
