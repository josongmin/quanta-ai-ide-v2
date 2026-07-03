import { findPerson } from '@entities/pr';

type AvatarProps = {
  login: string;
  size?: number;
};

/** Tiny round avatar. Initials on top of an HSL background derived from
    the person's `hue`. Falls back to a neutral disc for unknown logins. */
export default function Avatar({ login, size = 24 }: AvatarProps) {
  const person = findPerson(login);
  const bg = `hsl(${person.hue.toString()}, 60%, 45%)`;
  const fontSize = Math.max(8, Math.round(size * 0.42));
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-bold text-[var(--fg-on-accent)] shrink-0 select-none"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize,
        lineHeight: 1,
      }}
      title={`${person.display} (@${person.login})`}
      aria-label={person.display}
    >
      {person.initials}
    </span>
  );
}
