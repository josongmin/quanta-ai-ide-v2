import type { ReactNode } from 'react';
import { ThemeProvider } from '@shared/theme';
import { HtmlLangSync } from '@shared/i18n';
import { TokensProvider } from '@features/chat-agent';
import { PrefsProvider } from '@features/tweak-prefs';
import { ViewModeProvider } from '@features/switch-mode';
import { OverlayProvider } from '@features/apply-overlay';
import { BoundaryProvider } from '@features/inspect-boundaries';
import { StackProvider } from '@features/inspect-target';

// Outer providers — the ones that don't depend on a built repo.
// FilterProvider is intentionally kept at the call site since it needs
// `repo` as a prop, which is built once inside the app entry point.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TokensProvider>
      <ThemeProvider>
        <PrefsProvider>
          <ViewModeProvider>
            <OverlayProvider>
              <BoundaryProvider>
                <StackProvider>
                {/* Mirrors active i18n locale onto <html lang> for a11y / SEO. */}
                <HtmlLangSync />
                  {children}
                </StackProvider>
              </BoundaryProvider>
            </OverlayProvider>
          </ViewModeProvider>
        </PrefsProvider>
      </ThemeProvider>
    </TokensProvider>
  );
}
