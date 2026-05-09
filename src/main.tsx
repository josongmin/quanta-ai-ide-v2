import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './index.css';
import { applyTokens } from '@shared/tokens';

// Stamp the active theme's CSS variables onto :root *before* React mounts
// so the very first React render reads correct `var(--bg-canvas)` etc.
// and never paints a frame against unset variables (which can fall back to
// the browser's default white). Mirror the no-flash logic in index.html:
// localStorage wins, then fall back to dark.
(() => {
  try {
    const t = localStorage.getItem('app:theme');
    applyTokens(t === 'light' ? 'light' : 'dark');
  } catch {
    applyTokens('dark');
  }
})();

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
