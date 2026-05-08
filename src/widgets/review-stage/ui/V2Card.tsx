// ─────────────────────────────────────────────────────────────────────────
// V2Card — the glass-panel primitive used by every scene on the review
// spine. Hard-pinned dark; backdrop-filter is the surface's signature.
// ─────────────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';

export default function V2Card({
  className = '', children, style,
}: {
  className?: string; children: ReactNode; style?: CSSProperties;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'rgba(13, 17, 23, 0.78)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
