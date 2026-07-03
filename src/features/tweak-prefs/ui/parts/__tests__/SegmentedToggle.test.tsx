import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SegmentedToggle } from '../SegmentedToggle';

// Exercises the shared render + user-event paved path (jsdom stubs live in
// src/test/setup.ts) and covers SegmentedToggle's WAI-ARIA radiogroup keyboard
// behaviour: a single tab stop with arrow-key selection.

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
] as const;

describe('SegmentedToggle', () => {
  it('renders a labelled radiogroup with the active option checked', () => {
    render(
      <SegmentedToggle options={[...OPTIONS]} value="a" onChange={vi.fn()} ariaLabel="Pick" />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Pick' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked();
  });

  it('calls onChange when an option is clicked', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedToggle options={[...OPTIONS]} value="a" onChange={onChange} ariaLabel="Pick" />,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('moves selection with arrow keys', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedToggle options={[...OPTIONS]} value="a" onChange={onChange} ariaLabel="Pick" />,
    );
    screen.getByRole('radio', { name: 'Alpha' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('keeps only the active radio in the tab order (roving tabindex)', () => {
    render(
      <SegmentedToggle options={[...OPTIONS]} value="b" onChange={vi.fn()} ariaLabel="Pick" />,
    );
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('tabindex', '-1');
  });
});
