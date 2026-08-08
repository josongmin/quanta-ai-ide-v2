import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Toggle, Checkbox, SaveBar } from '../primitives';

// Controlled boolean primitives used across every settings surface. Lock the
// role/aria-checked contract + the onChange(!value) toggle + disabled guard.

describe('Toggle', () => {
  it('exposes a switch role reflecting its checked state', () => {
    render(<Toggle checked onChange={vi.fn()} label="Notifications" />);
    expect(screen.getByRole('switch', { name: 'Notifications' })).toBeChecked();
  });

  it('calls onChange with the negated value on click', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="Notifications" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} disabled label="Notifications" />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('exposes a checkbox role reflecting its checked state', () => {
    render(<Checkbox checked onChange={vi.fn()} label="Agree" />);
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeChecked();
  });

  it('toggles via onChange on click', async () => {
    const onChange = vi.fn();
    render(<Checkbox checked onChange={onChange} label="Agree" />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('SaveBar', () => {
  it('disables save when persistence is explicitly blocked', () => {
    render(
      <SaveBar
        visible
        dirty
        savingState="idle"
        onSave={vi.fn()}
        onDiscard={vi.fn()}
        saveDisabled
        saveDisabledTitle="Backend contract missing"
      />,
    );

    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('title', 'Backend contract missing');
  });
});
