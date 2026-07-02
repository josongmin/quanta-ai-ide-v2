import type { TFn } from './types';

// Vertical resize grip pinned to the very top of the card. Dragging up grows
// the widget (it's anchored to the viewport bottom). Double-click resets to
// the CSS default; ArrowUp/Down nudge ±24px; Home/Esc reset. Pattern: macOS
// Finder column separator + VS Code panel grip. Only rendered when there's a
// conversation — the empty state hugs content and has nothing to resize.
//
// Resize-handle WAI-ARIA pattern uses role="separator" but with interactive
// pointer/key handlers — the lint rule flags this even though it is the
// canonical pattern.
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
export function ResizeHandle({
  isResizing,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onKeyDown,
  t,
}: {
  isResizing: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  t: TFn;
}) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t('agent.resize', { defaultValue: 'Resize chat panel' })}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      className={`absolute top-0 left-0 right-0 h-2 -mt-1 z-20 cursor-ns-resize flex items-center justify-center group ${
        isResizing ? '' : ''
      }`}
    >
      <span
        className={`block w-8 h-[3px] rounded-full transition-all ${
          isResizing
            ? 'bg-[color:var(--fg-default)] opacity-80 w-12'
            : 'bg-[color:var(--fg-subtle)] opacity-30 group-hover:opacity-70 group-focus-visible:opacity-90'
        }`}
      />
    </div>
  );
}
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
