import type { ReactNode } from 'react';
import { ViewModeProvider } from '@features/switch-mode/model/ViewModeContext';
import { OverlayProvider } from '@features/apply-overlay/model/OverlayContext';
import { BoundaryProvider } from '@features/inspect-boundaries/model/BoundaryContext';
import { StackProvider } from '@features/inspect-target/model/StackContext';
import { InvestigationRunnerProvider } from '@features/investigation/model/InvestigationContext';

// The Intelligence surface's OWN provider tree — surface-scoped, not global.
// (App-wide capabilities like Jobs/InvestigationNotebook live in AppProviders
// and are intentionally NOT composed here.) Lives with the surface so the
// surface is self-contained and the activator can return a plain { Component };
// there is no separate Provider slot in the surface-module contract.
export function IntelligenceStageProvider({ children }: { children: ReactNode }) {
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
