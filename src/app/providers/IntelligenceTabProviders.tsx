import type { ReactNode } from 'react';
import { ViewModeProvider } from '@features/switch-mode/model/ViewModeContext';
import { OverlayProvider } from '@features/apply-overlay/model/OverlayContext';
import { BoundaryProvider } from '@features/inspect-boundaries/model/BoundaryContext';
import { StackProvider } from '@features/inspect-target/model/StackContext';
import { InvestigationRunnerProvider } from '@features/investigation/model/InvestigationContext';

export function IntelligenceTabProviders({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <OverlayProvider>
        <BoundaryProvider>
          <StackProvider>
            <InvestigationRunnerProvider>{children}</InvestigationRunnerProvider>
          </StackProvider>
        </BoundaryProvider>
      </OverlayProvider>
    </ViewModeProvider>
  );
}
