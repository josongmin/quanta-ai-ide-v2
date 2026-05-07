import type { Person } from '../model';

// Cast of fictional contributors. Hue is the avatar bg; initials are the
// glyph. Keep small — one switch statement saves a lookup table.

export const PEOPLE: Person[] = [
  { login: 'songmin',   display: 'Song Min',     initials: 'SM', hue: 145 },
  { login: 'haeun',     display: 'Ha Eun',       initials: 'HE', hue: 215 },
  { login: 'jiho',      display: 'Ji Ho',        initials: 'JH', hue: 30  },
  { login: 'sora',      display: 'So Ra',        initials: 'SR', hue: 285 },
  { login: 'yuna',      display: 'Yu Na',        initials: 'YN', hue: 0   },
  { login: 'minjun',    display: 'Min Jun',      initials: 'MJ', hue: 175 },
  { login: 'leo',       display: 'Leo',          initials: 'L',  hue: 90  },
  { login: 'agent',     display: 'p0 agent',     initials: 'p0', hue: 130 },
];

const BY_LOGIN = new Map(PEOPLE.map((p) => [p.login, p]));

export function findPerson(login: string): Person {
  // Fall back to a synthetic record so a stale comment doesn't crash
  // rendering — `display` shows the raw login, hue stays neutral.
  return BY_LOGIN.get(login) ?? {
    login,
    display: login,
    initials: login.slice(0, 2).toUpperCase(),
    hue: 220,
  };
}
