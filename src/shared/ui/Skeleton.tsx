import type { CSSProperties } from 'react';

// Token-styled loading placeholder. The convention for any surface that will
// load async data once the backend is wired — use in place of blank space so
// perceived latency drops and layout doesn't jump.

type Props = {
  width?: number | string;
  height?: number | string;
  rounded?: string;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({
  width = '100%', height = 12, rounded = 'rounded-md', className = '', style,
}: Props) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse ${rounded} ${className}`}
      style={{ width, height, background: 'var(--bg-hover)', ...style }}
    />
  );
}

/** N stacked skeleton lines, last one shortened — the common "text block"
 *  placeholder. */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
