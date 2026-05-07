import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';

// i18n setup runs on import — must precede the first render so the very
// first `useTranslation()` call sees a configured instance.
import i18n from '@shared/i18n/config';

// Locales are lazy-loaded (one chunk per locale × namespace). Pre-load only
// the namespaces visible on first paint so we avoid a flash of untranslated
// keys; everything else (filter, inspect, chat, prefs, mode, overlay, search)
// loads on demand when the user opens those panels.
void (async () => {
  try {
    await i18n.loadNamespaces(['common', 'app']);
  } catch {
    // Boot must not block on i18n; if loading fails, render with the
    // detector's fallback ('en') and let suspense-less rendering surface keys.
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
