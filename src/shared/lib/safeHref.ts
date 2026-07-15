// Guard a data-driven href against scheme injection. React does NOT sanitize
// href — a value like `javascript:alert(document.cookie)` executes on click. Any
// URL that comes from data (PR url, environment url, DPA url, …) that could
// become backend/user-supplied must pass through here. Allows only http(s) (and
// protocol-relative `//host`); anything else → undefined (inert link).
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return trimmed;
  return undefined;
}
