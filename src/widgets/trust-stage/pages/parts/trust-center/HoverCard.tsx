import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useHoverStyle } from '@shared/lib';

export function HoverCard({
  children, className, style, hover, rest,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hover: CSSProperties;
  rest: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useHoverStyle(ref, { ...rest, ...hover }, { ...rest, ...style });
  return (
    <div ref={ref} className={className} style={{ ...rest, ...style }}>
      {children}
    </div>
  );
}
