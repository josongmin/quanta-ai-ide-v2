// ─────────────────────────────────────────────────────────────────────────
// V2Card — the glass-panel primitive used by every scene on the review
// spine. Dark-only blur: in light mode --bg-overlay is near-opaque so blur
// adds GPU cost with no visible refraction; per policy light should be
// solid anyway.
// ─────────────────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '@shared/theme';

export default function V2Card({
  className = '', children, style,
}: {
  className?: string; children: ReactNode; style?: CSSProperties;
}) {
  const { isDark } = useTheme();
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'var(--bg-overlay)',
        border: '1px solid var(--border-default)',
        ...(isDark ? {
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
