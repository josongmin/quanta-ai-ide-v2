// Public surface: features import the hook + the small Locale helper.
// `./config` runs `i18n.init()` for its side effects and must be imported
// once at app boot (see `src/app/App.tsx`).
export { useTranslation } from 'react-i18next';
export { default as i18n, SUPPORTED_LOCALES, NAMESPACES, type Locale } from './config';
export { HtmlLangSync } from './HtmlLangSync';
