import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useViewMode } from '@features/switch-mode';
import { IntelligenceTabProviders } from '../IntelligenceTabProviders';
import { InvestigationNotebookProvider } from '@features/investigation';

function Probe({ name }: { name: string }) {
  const { mode, setMode } = useViewMode();
  return (
    <button type="button" onClick={() => { setMode('universe'); }}>
      {name}:{mode}
    </button>
  );
}

describe('IntelligenceTabProviders', () => {
  it('isolates mutable view state between duplicate tab instances', () => {
    render(
      <InvestigationNotebookProvider>
        <IntelligenceTabProviders><Probe name="first" /></IntelligenceTabProviders>
        <IntelligenceTabProviders><Probe name="second" /></IntelligenceTabProviders>
      </InvestigationNotebookProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'first:dot-field' }));
    expect(screen.getByRole('button', { name: 'first:universe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'second:dot-field' })).toBeInTheDocument();
  });
});
