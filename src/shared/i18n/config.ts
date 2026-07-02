import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { STORAGE_KEYS } from '@shared/lib';

export const SUPPORTED_LOCALES = ['en', 'ko', 'ja', 'zh'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const NAMESPACES = [
  'common', 'app', 'filter', 'inspect', 'chat', 'prefs', 'mode', 'overlay', 'search', 'help', 'coding',
  'review', 'admission', 'diff', 'fix-pipeline', 'verified-fix', 'agents',
] as const;

const STORAGE_KEY = STORAGE_KEYS.i18nLang;

// Lazy-load resources via Vite dynamic import. Each locale × namespace
// becomes its own chunk; the entry no longer ships any locale JSON.
// The template literal is statically resolvable at build time so Rollup
// generates one chunk per matched JSON file.
void i18n
  .use(
    resourcesToBackend(
      (lng: string, ns: string) =>
        import(`./locales/${lng}/${ns}.json`),
    ),
  )
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    ns: NAMESPACES,
    defaultNS: 'common',
    detection: {
      // Honor explicit user choice first, then browser language.
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: {
      // React already escapes; double-escaping mangles "100%".
      escapeValue: false,
    },
    returnNull: false,
    react: {
      // ChatAgent is already wrapped in Suspense for its own lazy boundary;
      // disabling i18n's Suspense integration avoids double-suspense edge
      // cases in tests/Storybook. main.tsx pre-loads `common`+`app` before
      // the first render so the initial paint has translations ready.
      useSuspense: false,
    },
  });

export default i18n;
