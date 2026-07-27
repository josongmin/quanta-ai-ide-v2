import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useViewMode } from '@features/switch-mode';
import { IntelligenceStageProvider } from '../IntelligenceStageProvider';
import { InvestigationNotebookProvider } from '@features/investigation';

function Probe({ name }: { name: string }) {
  const { mode, setMode } = useViewMode();
  return (
    <button type="button" onClick={() => { setMode('universe'); }}>
      {name}:{mode}
    </button>
  );
}

describe('IntelligenceStageProvider', () => {
  it('isolates mutable view state between duplicate surface instances', () => {
    // InvestigationNotebook is an APP-global capability (AppProviders), so it
    // wraps both surface instances here — it is deliberately NOT part of the
    // per-surface provider tree.
    render(
      <InvestigationNotebookProvider>
        <IntelligenceStageProvider><Probe name="first" /></IntelligenceStageProvider>
        <IntelligenceStageProvider><Probe name="second" /></IntelligenceStageProvider>
      </InvestigationNotebookProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'first:dot-field' }));
    expect(screen.getByRole('button', { name: 'first:universe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'second:dot-field' })).toBeInTheDocument();
  });
});
