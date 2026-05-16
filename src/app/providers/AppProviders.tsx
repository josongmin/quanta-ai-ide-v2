import type { ComponentType, ReactNode } from 'react';
import { ThemeProvider } from '@shared/theme';
import { HtmlLangSync } from '@shared/i18n';
// Deep-import the providers rather than going through each slice's barrel.
// The barrels re-export heavy UI components (FocusScanStack, ChatAgent, the
// investigation panels …) and Rollup can't always shake those out — going
// straight to the context module guarantees the initial chunk only pays for
// the provider itself.
import { TokensProvider } from '@features/chat-agent/model/TokensContext';
import { PrefsProvider } from '@features/tweak-prefs/model/PrefsContext';
import { ViewModeProvider } from '@features/switch-mode/model/ViewModeContext';
import { OverlayProvider } from '@features/apply-overlay/model/OverlayContext';
import { BoundaryProvider } from '@features/inspect-boundaries/model/BoundaryContext';
import { StackProvider } from '@features/inspect-target/model/StackContext';
import { InvestigationProvider } from '@features/investigation/model/InvestigationContext';
import { JobsProvider } from '@features/investigation/jobs/JobsContext';

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
  JobsProvider,
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
