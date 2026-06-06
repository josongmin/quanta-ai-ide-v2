import { useEffect, type RefObject, type CSSProperties } from 'react';

// Keys of CSSStyleDeclaration whose value is a string (the settable camelCase
// style properties such as `backgroundColor`, `opacity`, `transform`).
type WritableStringStyleKey = {
  [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends string ? K : never;
}[keyof CSSStyleDeclaration];

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
        // CSSStyleDeclaration exposes camelCase style props as writable string
        // members but has no string index signature in lib.dom, so we narrow
        // the key to its writable-string properties rather than widening the
        // whole declaration to a Record.
        el.style[k as WritableStringStyleKey] = String(v);
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
