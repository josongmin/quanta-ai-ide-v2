import type { Person } from '@entities/ownership';
import { createAvatarStyle } from './personAvatar';

export function PersonAvatar({
  person,
  size,
}: {
  person: Person | undefined;
  size: number;
}) {
  const initials = person?.initials ?? '??';
  const fontSize = Math.max(8, Math.round(size * 0.42));
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold tracking-[0.04em] shrink-0"
      style={{
        ...createAvatarStyle(person, size),
        fontSize,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
