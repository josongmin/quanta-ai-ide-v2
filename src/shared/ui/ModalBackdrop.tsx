import type { CSSProperties } from 'react';

// Single source of truth for the dimmed, click-to-dismiss overlay that sits
// behind modal/drawer surfaces. Replaces ~14 hand-rolled
//   <button className="fixed inset-0 ..." style={{ background: 'rgba(0,0,0,0.45)' }} />
// dismiss buttons scattered across stage pages.
//
// It is a real <button> (not a div) so keyboard/AT users can dismiss, and so
// jsx-a11y is satisfied without a static-element click handler.

type BlurScale = 'none' | 'sm' | 'md' | 'lg';

const BLUR_PX: Record<BlurScale, string | undefined> = {
  none: undefined,
  sm: 'blur(4px)',
  md: 'blur(8px)',
  lg: 'blur(20px) saturate(180%)',
};

export type ModalBackdropProps = {
  onClick: () => void;
  /** Tailwind z-index utility, e.g. "z-40". Defaults to z-40. */
  z?: string;
  /** Backdrop blur intensity. Defaults to 'none'. */
  blur?: BlurScale;
  /** Overlay tint alpha (0–1). Defaults to 0.45. */
  alpha?: number;
  /** Accessible label for the dismiss control. */
  label?: string;
  style?: CSSProperties;
};

export function ModalBackdrop({
  onClick,
  z = 'z-40',
  blur = 'none',
  alpha = 0.45,
  label = 'Dismiss',
  style,
}: ModalBackdropProps) {
  const filter = BLUR_PX[blur];
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`fixed inset-0 ${z} border-0 p-0 cursor-default`}
      style={{
        background: `rgba(0,0,0,${alpha})`,
        ...(filter ? { backdropFilter: filter, WebkitBackdropFilter: filter } : {}),
        ...style,
      }}
    />
  );
}
