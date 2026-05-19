import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useScrollRestoration } from '@shared/lib';

// The sanctioned scroll container. Any full-page / panel scroller should
// be a <ScrollPane> rather than a hand-rolled `<div className="… overflow-
// y-auto">` + a separate useScrollRestoration call — that pairing was
// easy to forget (only 7 of 8 stage scrollers had it) and easy to
// mis-key. ScrollPane wires the ref + restoration in one place so the
// keying/storage policy lives behind a single import.
//
// It is intentionally style-transparent: it forces NO overflow/layout
// classes of its own, so callers keep their exact className and there is
// zero visual change on migration. The only contract is `scope` (a
// stable storage namespace) and, for tab-hosted pages, `visible` (pass
// `useTabVisibility()` so the keep-mounted display:none case restores).

type Props = {
  /** Stable storage namespace, e.g. "catalog", "org", "ws". */
  scope: string;
  /**
   * Tab-host visibility. Pass `useTabVisibility()` from a tab-hosted
   * stage; omit on always-on routes (defaults to `true`).
   */
  visible?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;

export const ScrollPane = forwardRef<HTMLDivElement, Props>(function ScrollPane(
  { scope, visible = true, className, style, children, ...rest },
  forwarded,
) {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwarded, () => ref.current as HTMLDivElement, []);
  useScrollRestoration(scope, ref, { visible });

  return (
    <div ref={ref} className={className} style={style} {...rest}>
      {children}
    </div>
  );
});
