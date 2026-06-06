import type { CSSProperties } from 'react';
import type { Person } from '@entities/ownership';

export function createAvatarStyle(person: Person | undefined, size: number): CSSProperties {
  if (!person) {
    return {
      width: size,
      height: size,
      background: 'var(--bg-surface-muted)',
      border: '1px solid var(--border-muted)',
      color: 'var(--fg-subtle)',
    };
  }
  const stale = !person.active;
  const sat = stale ? 14 : 58;
  const lightDark = stale ? 36 : 44;
  return {
    width: size,
    height: size,
    background: `hsl(${person.avatarHue} ${sat}% ${lightDark}% / ${stale ? 0.55 : 0.92})`,
    border: '1px solid var(--border-muted)',
    color: 'rgba(255,255,255,0.94)',
  };
}
