import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Mirrors the active i18n locale onto `<html lang>` so screen readers,
 * search engines, and CSS `:lang(...)` selectors stay in sync with the UI.
 *
 * Renders nothing — mount once near the root (see AppProviders).
 */
export function HtmlLangSync(): null {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [i18n.resolvedLanguage, i18n.language]);

  return null;
}
