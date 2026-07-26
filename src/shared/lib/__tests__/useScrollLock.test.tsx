import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useScrollLock } from '../useScrollLock';

function Lock({ active }: { active: boolean }) {
  useScrollLock(active);
  return null;
}

describe('useScrollLock', () => {
  afterEach(() => { document.body.style.overflow = ''; });

  it('keeps the body locked until the final nested owner releases', () => {
    document.body.style.overflow = 'auto';
    const { rerender } = render(
      <><Lock active /><Lock active /></>,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<><Lock active /><Lock active={false} /></>);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<><Lock active={false} /><Lock active={false} /></>);
    expect(document.body.style.overflow).toBe('auto');
  });
});
