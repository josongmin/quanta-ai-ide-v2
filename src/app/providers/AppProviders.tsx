import type { ComponentType, ReactNode } from 'react';
import { ThemeProvider } from '@shared/theme';
import { HtmlLangSync } from '@shared/i18n';
import { WorkbenchRoot } from '@shared/workbench/react';
import { UIRuntimeProvider } from '@shared/ui/runtime/UIRuntimeProvider';
// Deep-import the providers rather than going through each slice's barrel.
// The barrels re-export heavy UI components (FocusScanStack, ChatAgent, the
// investigation panels …) and Rollup can't always shake those out — going
// straight to the context module guarantees the initial chunk only pays for
// the provider itself.
import { TokensProvider } from '@features/chat-agent/model/TokensContext';
import { PrefsProvider } from '@features/tweak-prefs/model/PrefsContext';
import { InvestigationNotebookProvider } from '@features/investigation/model/InvestigationContext';
import { JobsProvider } from '@features/investigation/jobs/JobsContext';

// Outer order = outermost first. FilterProvider stays at the call site since
// it needs a built `repo` prop.
const PROVIDERS: ComponentType<{ children: ReactNode }>[] = [
  ThemeProvider,
  // Composition root: owns the canonical workbench kernel session (WBT-04).
  // Mounted once, outermost of the runtime providers.
  WorkbenchRoot,
  UIRuntimeProvider,
  TokensProvider,
  PrefsProvider,
  InvestigationNotebookProvider,
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
