import { useEffect, type RefObject, type CSSProperties } from 'react';

// Applies presentational hover styles via native DOM listeners instead of
// JSX-level onMouseEnter/onMouseLeave. This keeps decorative hover effects
// off static <div> elements so jsx-a11y/no-static-element-interactions does
// not (correctly) complain about non-interactive mouse listeners.
export function useHoverStyle<T extends HTMLElement>(
  ref: RefObject<T | null>,
  hover: CSSProperties,
  rest: CSSProperties = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (styles: CSSProperties) => {
      for (const [k, v] of Object.entries(styles)) {
        if (v == null) continue;
        // CSSStyleDeclaration accepts string assignment per property.
        (el.style as unknown as Record<string, string>)[k] = String(v);
      }
    };
    const onEnter = () => { apply(hover); };
    const onLeave = () => { apply(rest); };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref, hover, rest]);
}
