// ─────────────────────────────────────────────────────────────────────────
// viewShare — encode/decode (scope, query) recipes into URL hash so a
// reviewer can share their current view by copying the URL.
//
// Why hash, not query string:
//
//   • Tanstack Router on this surface owns the path + query. Hash
//     is a free channel we can use without colliding with the router.
//   • Krug (2014) — copyable links lower the cost of "show me what
//     you're looking at" coordination, which Sadowski (Google 2018)
//     identified as the #1 async-collaboration friction in code
//     review.
//
// Format: `#review:scope=mine&q=auth%20middleware`
// Compact, human-inspectable, easy to extend with more fields later.
// ─────────────────────────────────────────────────────────────────────────

import type { QueueScope } from '../ui/left-queue/types';

const HASH_PREFIX = 'review:';

export type SharedView = {
  scope: QueueScope;
  query: string;
};

const SCOPES: ReadonlySet<QueueScope> = new Set(['all', 'mine', 'archived']);

function encodeShareHash(view: SharedView): string {
  const params = new URLSearchParams();
  params.set('scope', view.scope);
  if (view.query.trim().length > 0) params.set('q', view.query);
  return `#${HASH_PREFIX}${params.toString()}`;
}

export function buildShareUrl(view: SharedView): string {
  if (typeof window === 'undefined') return encodeShareHash(view);
  const u = new URL(window.location.href);
  u.hash = encodeShareHash(view);
  return u.toString();
}

export function decodeShareHash(hash: string): SharedView | null {
  if (hash.length === 0) return null;
  const stripped = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!stripped.startsWith(HASH_PREFIX)) return null;
  const rest = stripped.slice(HASH_PREFIX.length);
  try {
    const params = new URLSearchParams(rest);
    const scope = params.get('scope');
    const q = params.get('q') ?? '';
    if (scope === null || !SCOPES.has(scope as QueueScope)) return null;
    return { scope: scope as QueueScope, query: q };
  } catch {
    return null;
  }
}

/**
 * Best-effort clipboard write using the modern Async Clipboard API.
 * No legacy execCommand fallback — the deprecated API is gated by
 * lint, and modern Tauri/Chrome/Safari ship clipboard.writeText.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (navigator.clipboard?.writeText === undefined) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
