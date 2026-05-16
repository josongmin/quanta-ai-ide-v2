// ── Repo color coding ────────────────────────────────────────────────────
//
// Identity-hue per repo, stable across sessions (hash of name → hue).
// Tufte: a category that recurs throughout the surface earns one hue,
// reused everywhere. Saturation/lightness are fixed so the palette
// reads as a *set*, not a rainbow — only hue varies.
//
// Two surfaces consume this:
//   • Initial badge in the group header (fill)
//   • 1px stripe on rows in that group (low-alpha left edge)
//
// We keep saturation low (~28%) and lightness mid (~62%) so the badges
// never out-shout the status dot or risk accent.
export function repoHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}
export function repoBadgeColor(name: string): { bg: string; fg: string; line: string } {
  const h = repoHue(name);
  return {
    bg:   `hsla(${String(h)}, 35%, 55%, 0.18)`,
    fg:   `hsla(${String(h)}, 50%, 80%, 1)`,
    line: `hsla(${String(h)}, 35%, 60%, 0.30)`,
  };
}

// ── Author avatar ────────────────────────────────────────────────────────
// Hue-keyed initials chip. Echoes the repo-badge palette but dialed
// brighter so the eye reads "person" before "category". 16×16 — same
// height as the row's status glyph, so the two read as a paired column.
export function authorAvatarColor(hue: number): { bg: string; fg: string } {
  return {
    bg: `hsla(${String(hue)}, 55%, 55%, 0.22)`,
    fg: `hsla(${String(hue)}, 60%, 38%, 1)`,
  };
}
