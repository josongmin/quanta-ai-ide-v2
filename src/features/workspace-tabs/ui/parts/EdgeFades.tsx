type EdgeFadesProps = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

// Left/right scroll fade scrim that overlays the strip when it overflows.
// Rendered as siblings of the overflow-x scroller (never inside it) so the
// fades stay pinned to the viewport edges instead of drifting with scroll.
export function EdgeFades({ canScrollLeft, canScrollRight }: EdgeFadesProps) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-8 transition-opacity"
        style={{
          opacity: canScrollLeft ? 1 : 0,
          background: 'linear-gradient(to right, color-mix(in srgb, var(--bg-overlay) 92%, transparent), transparent)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[3] w-8 transition-opacity"
        style={{
          opacity: canScrollRight ? 1 : 0,
          background: 'linear-gradient(to left, color-mix(in srgb, var(--bg-overlay) 92%, transparent), transparent)',
        }}
      />
    </>
  );
}
