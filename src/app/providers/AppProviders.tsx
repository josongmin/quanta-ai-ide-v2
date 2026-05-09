import type { ComponentType, ReactNode } from 'react';
import { ThemeProvider } from '@shared/theme';
import { HtmlLangSync } from '@shared/i18n';
import { TokensProvider } from '@features/chat-agent';
import { PrefsProvider } from '@features/tweak-prefs';
import { ViewModeProvider } from '@features/switch-mode';
import { OverlayProvider } from '@features/apply-overlay';
import { BoundaryProvider } from '@features/inspect-boundaries';
import { StackProvider } from '@features/inspect-target';
import { InvestigationProvider } from '@features/investigation';

// Outer order = outermost first. FilterProvider stays at the call site since
// it needs a built `repo` prop.
const PROVIDERS: ComponentType<{ children: ReactNode }>[] = [
  ThemeProvider,
  TokensProvider,
  PrefsProvider,
  ViewModeProvider,
  OverlayProvider,
  BoundaryProvider,
  StackProvider,
  InvestigationProvider,
];

export function AppProviders({ children }: { children: ReactNode }) {
  const tree = PROVIDERS.reduceRight<ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    <>
      <HtmlLangSync />
      {children}
    </>,
  );
  return <>{tree}</>;
}
