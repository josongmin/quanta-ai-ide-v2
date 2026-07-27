import { IntelligenceStageProvider } from './model/IntelligenceStageProvider';
import IntelligenceLayout from './ui/IntelligenceLayout';

// The Intelligence surface. Its per-surface providers are composed HERE, inside
// the surface component, so the catalog activator returns a plain { Component } —
// there is no Provider slot in the surface-module contract (every surface folds
// its own providers, uniformly). Mirrors how CodingStage etc. own their setup.
export function IntelligenceStage() {
  return (
    <IntelligenceStageProvider>
      <IntelligenceLayout />
    </IntelligenceStageProvider>
  );
}
