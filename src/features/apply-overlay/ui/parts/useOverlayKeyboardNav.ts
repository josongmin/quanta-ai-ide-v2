import { useRef, type KeyboardEvent, type RefObject } from 'react';

// Roving-tablist arrow-key navigation for the master-detail rail.
//
// Up/Down wrap around the ordered list, Home/End jump to the ends, and focus
// follows the newly-selected tab so screen readers track the change. The
// element matched for focus is the rail button carrying `data-row-id`, which
// keeps this hook decoupled from the row rendering.
export function useOverlayKeyboardNav<Id extends string>({
  order, selected, onSelect,
}: {
  order: readonly Id[];
  selected: Id;
  onSelect: (id: Id) => void;
}): {
  railRef: RefObject<HTMLDivElement>;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
} {
  const railRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = order.indexOf(selected);
    let next = i;
    if (e.key === 'ArrowDown') next = (i + 1) % order.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    onSelect(order[next]);
    // Move focus to the newly-selected tab so screen readers track.
    const btn = railRef.current?.querySelector<HTMLButtonElement>(
      `button[data-row-id="${order[next]}"]`,
    );
    btn?.focus();
  };

  return { railRef, onKeyDown };
}
