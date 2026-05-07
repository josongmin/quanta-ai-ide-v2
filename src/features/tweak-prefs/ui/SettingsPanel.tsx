import { useState } from 'react';
import { Settings2, X, Lock, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { useTranslation, SUPPORTED_LOCALES, type Locale } from '@shared/i18n';
import { usePrefs, type Plan } from '../model/PrefsContext';
import { CATEGORIES, FACETS } from '@entities/facet';
import { GlassCard, Modal } from '@shared/ui';

// Narrowing helper — i18n's `resolvedLanguage` is typed `string | undefined`
// because i18next supports any IETF tag at runtime. We only render against
// SUPPORTED_LOCALES, so a guard turns the cast into a real check that falls
// back to 'en' for any unrecognized tag (e.g. user changed lang externally).
function isLocale(v: string | undefined): v is Locale {
  return typeof v === 'string'
    && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}
function toLocale(v: string | undefined): Locale {
  return isLocale(v) ? v : 'en';
}

export default function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const { isDark } = useTheme();
  const prefs = usePrefs();
  const { t, i18n } = useTranslation('prefs');
  const [open, setOpen] = useState(false);
  const currentLang = toLocale(i18n.resolvedLanguage);

  const PLAN_LABEL: Record<Plan, string> = {
    free: t('plan.free'),
    pro: t('plan.pro'),
    enterprise: t('plan.enterprise'),
  };

  return (
    <>
      {compact ? (
        <button type="button"
          onClick={() => { setOpen(true); }}
          title={t('openTitle')}
          aria-label={t('openAria')}
          className={`p-2 rounded-full transition-all hover:scale-110 active:scale-90 ${
            isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-black/5 text-black/55 hover:text-black'
          }`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      ) : (
        <button type="button"
          onClick={() => { setOpen(true); }}
          className={`w-full py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all ${
            isDark
              ? 'bg-white/5 border-white/5 text-white/55 hover:bg-white/15 hover:text-white'
              : 'bg-black/5 border-black/5 text-black/55 hover:bg-black/15 hover:text-black'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          {t('buttonLabel')}
        </button>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); }}
        width="100%"
        ariaLabel={t('title')}
      >
        <div className="max-w-2xl max-h-[80vh] overflow-hidden">
          <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 id="facet-settings-title" className={`text-base font-black uppercase tracking-[0.18em] ${isDark ? 'text-white' : 'text-black'}`}>{t('title')}</h2>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                    {t('subtitle')}
                  </p>
                </div>
                <button type="button"
                  onClick={() => { setOpen(false); }}
                  aria-label={t('closeAria')}
                  className={isDark ? 'text-white/55 hover:text-white' : 'text-black/55 hover:text-black'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Plan switcher (demo) */}
              <div className="mb-5">
                <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {t('plan.heading')}
                </div>
                <div className="flex gap-2">
                  {(['free', 'pro', 'enterprise'] as Plan[]).map((p) => (
                    <button type="button"
                      key={p}
                      onClick={() => { prefs.setPlan(p); }}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] border transition-colors ${
                        prefs.plan === p
                          ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                          : (isDark ? 'bg-white/5 border-white/5 text-white/55 hover:bg-white/10' : 'bg-black/5 border-black/5 text-black/55 hover:bg-black/10')
                      }`}
                    >
                      {PLAN_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language toggle */}
              <section className="mb-5">
                <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                  {t('language.title')}
                </div>
                <div className="flex gap-2">
                  {SUPPORTED_LOCALES.map((lng) => {
                    const active = currentLang === lng;
                    return (
                      <button type="button"
                        key={lng}
                        onClick={() => { void i18n.changeLanguage(lng); }}
                        aria-pressed={active}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] border transition-colors ${
                          active
                            ? (isDark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                            : (isDark ? 'bg-white/5 border-white/5 text-white/55 hover:bg-white/10' : 'bg-black/5 border-black/5 text-black/55 hover:bg-black/10')
                        }`}
                      >
                        {t(`language.${lng}`)}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Per-facet visibility */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 scrollbar-hide">
                {CATEGORIES.map((cat) => {
                  const fs = FACETS.filter((f) => f.category === cat.key);
                  if (fs.length === 0) return null;
                  return (
                    <div key={cat.key} className="mb-4">
                      <div className={`text-[10px] font-black uppercase tracking-[0.18em] mb-2 ${isDark ? 'text-white/55' : 'text-black/55'}`}>
                        {cat.label}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {fs.map((f) => {
                          const unlocked = prefs.isUnlocked(f);
                          const hidden = prefs.hidden.has(f.key);
                          const Icon = !unlocked ? Lock : hidden ? EyeOff : Eye;
                          return (
                            <button type="button"
                              key={f.key}
                              disabled={!unlocked}
                              onClick={() => { prefs.toggleHidden(f.key); }}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px] border transition-colors text-left ${
                                !unlocked
                                  ? (isDark ? 'bg-white/[0.02] border-white/5 text-white/30 cursor-not-allowed' : 'bg-black/[0.02] border-black/5 text-black/30 cursor-not-allowed')
                                  : hidden
                                    ? (isDark ? 'bg-white/[0.03] border-white/5 text-white/40 hover:bg-white/[0.07]' : 'bg-black/[0.03] border-black/5 text-black/40 hover:bg-black/[0.07]')
                                    : (isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-black/10 border-black/10 text-black')
                              }`}
                            >
                              <Icon className="w-3 h-3 shrink-0" />
                              <span className="font-bold truncate">{f.label}</span>
                              {!unlocked && (
                                <span className={`ml-auto text-[8px] uppercase font-black ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                                  {f.requiredPlan}
                                </span>
                              )}
                              {f.source && unlocked && (
                                <span className={`ml-auto text-[8px] font-mono ${isDark ? 'text-white/30' : 'text-black/30'}`}>
                                  {f.source}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
          </GlassCard>
        </div>
      </Modal>
    </>
  );
}
