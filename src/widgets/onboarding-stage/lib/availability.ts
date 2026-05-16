// Demo availability checks. Real implementation would hit a debounced API;
// here a small static blacklist drives the "taken" state so we can demo the
// async-feeling lookup without a backend.

import { useEffect, useState } from 'react';

const TAKEN_HANDLES = new Set([
  'admin', 'sora', 'support', 'help', 'api', 'system', 'official',
  'sefield', 'team', 'staff',
]);

const TAKEN_SLUGS = new Set([
  'acme', 'admin', 'api', 'app', 'docs', 'help', 'support', 'team',
  'github', 'gitlab', 'enterprise', 'pied-piper',
]);

const RESERVED_SLUGS = new Set([
  'auth', 'onboarding', 'org', 'me', 'settings', 'billing', 'catalog',
  'login', 'logout', 'signup', 'admin', 'system', 'webhook', 'webhooks',
]);

const TAKEN_INVITE_CODES = new Set([
  'ACME-7HQF-TEAM', 'GLOBEX-K9P3-WEB', 'INITECH-VK2X-AI',
]);

export type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

export type AvailabilityResult = {
  state: AvailabilityState;
  message: string;
};

// Debounced availability hook. Returns idle until the value stabilizes for
// `debounceMs` (default 350ms), then `checking` for an artificial 500ms,
// then settles to available/taken/reserved/invalid.
export function useAvailability(
  value: string,
  kind: 'handle' | 'slug' | 'invite-code',
  debounceMs = 350,
): AvailabilityResult {
  const [state, setState] = useState<AvailabilityState>('idle');

  /* eslint-disable react-hooks/set-state-in-effect -- false-positive: async tick */
  useEffect(() => {
    const v = value.trim();
    if (!v) { setState('idle'); return; }

    // Instant validity check — applies before the debounce.
    if (kind === 'handle' && !/^[a-z0-9_-]{2,32}$/.test(v)) {
      setState('invalid'); return;
    }
    if (kind === 'slug' && !/^[a-z0-9-]{2,32}$/.test(v)) {
      setState('invalid'); return;
    }
    if (kind === 'invite-code' && !/^[A-Z0-9-]{8,32}$/.test(v)) {
      setState('invalid'); return;
    }

    setState('checking');
    const t1 = setTimeout(() => {
      setState('checking');
      const t2 = setTimeout(() => {
        if (kind === 'handle') {
          setState(TAKEN_HANDLES.has(v) ? 'taken' : 'available');
        } else if (kind === 'slug') {
          if (RESERVED_SLUGS.has(v)) setState('reserved');
          else setState(TAKEN_SLUGS.has(v) ? 'taken' : 'available');
        } else {
          setState(TAKEN_INVITE_CODES.has(v) ? 'available' : 'taken');
        }
      }, 500);
      return () => { clearTimeout(t2); };
    }, debounceMs);
    return () => { clearTimeout(t1); };
  }, [value, kind, debounceMs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { state, message: messageFor(state, kind, value) };
}

type CheckKind = 'handle' | 'slug' | 'invite-code';

function messageFor(state: AvailabilityState, kind: CheckKind, value: string): string {
  if (state === 'idle')      return '';
  if (state === 'checking')  return 'Checking availability…';
  if (state === 'available') return kind === 'invite-code' ? 'Code accepted' : 'Available';
  if (state === 'taken')     return kind === 'invite-code' ? 'Code is invalid or expired' : `${value} is taken`;
  if (state === 'reserved')  return `${value} is reserved by se · field`;
  if (state === 'invalid')   {
    if (kind === 'handle') return 'Use 2–32 chars: a–z, 0–9, _, -';
    if (kind === 'slug')   return 'Use 2–32 chars: a–z, 0–9, -';
    return 'Use 8–32 chars: A–Z, 0–9, -';
  }
  return '';
}
