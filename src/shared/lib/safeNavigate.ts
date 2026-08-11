// Guard a data-driven URL before handing it to `window.location.href` (a full
// page navigation). This is STRICTER than safeHref (which guards an <a href>):
//
//   • safeHref permits protocol-relative `//host` — fine for an anchor (the
//     browser resolves it against the current origin as a normal link) but a
//     latent open-redirect when fed to window.location, which will happily send
//     the browser to `//evil.com`.
//   • Here we resolve against the current origin and require an absolute
//     http(s) result, and optionally pin the destination host to an allowlist.
//
// Returns the resolved absolute href when safe, else undefined (caller aborts).
// `allowHosts` entries may be exact hostnames (`accounts.example.com`) or a
// single-level wildcard (`*.stripe.com`, which also matches the apex `stripe.com`).
export function safeNavigate(
  url: string | null | undefined,
  allowHosts?: readonly string[],
): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed === '') return undefined;

  let resolved: URL;
  try {
    resolved = new URL(trimmed, window.location.origin);
  } catch {
    return undefined;
  }

  // Only real navigable web schemes — blocks javascript:/data:/blob:/mailto: etc.
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return undefined;

  if (allowHosts && allowHosts.length > 0 && !hostAllowed(resolved.hostname, allowHosts)) {
    return undefined;
  }

  return resolved.href;
}

function hostAllowed(hostname: string, allowHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowHosts.some((entry) => {
    const allow = entry.trim().toLowerCase();
    if (allow === '') return false;
    if (allow.startsWith('*.')) {
      const suffix = allow.slice(2); // "*.stripe.com" → "stripe.com"
      return host === suffix || host.endsWith(`.${suffix}`);
    }
    return host === allow;
  });
}
