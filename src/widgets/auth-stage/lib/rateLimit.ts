// Tiny demo-only rate limiter. Persists attempt history in sessionStorage so
// reloads don't reset the lockout. In production this would be a server-side
// check; here it lets us demonstrate the lockout UI deterministically.

import { useEffect, useRef, useState } from 'react';
import { safeSessionGet, safeSessionSet } from '@shared/lib';

type Attempt = { at: number; ok: boolean };

const HISTORY_KEY = 'auth.rate.history.v1';

function readHistory(): Attempt[] {
  // Storage read is wrapped by the helper; the surrounding try/catch remains as
  // a parse guard for malformed JSON.
  try {
    const raw = safeSessionGet(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Attempt[]) : [];
  } catch { return []; }
}
function writeHistory(h: Attempt[]) {
  safeSessionSet(HISTORY_KEY, JSON.stringify(h));
}

export type RateLimitState = {
  attempts: number;       // failed attempts in the rolling window
  remaining: number;      // attempts left before lockout
  lockedUntil: number | null;   // epoch ms; null if not locked
  cooldownSec: number;    // seconds remaining if locked, 0 otherwise
};

export type RateLimitConfig = {
  maxFails: number;       // attempts allowed before cooldown
  windowMs: number;       // rolling window for counting fails
  cooldownMs: number;     // lockout duration once threshold hit
};

const DEFAULT_CFG: RateLimitConfig = {
  maxFails:  3,
  windowMs:  10 * 60 * 1000,  // 10 minutes
  cooldownMs: 60 * 1000,      // 1 minute lockout
};

export function useRateLimit(cfg: Partial<RateLimitConfig> = {}) {
  const config = { ...DEFAULT_CFG, ...cfg };
  const [, force] = useState(0);
  const tickRef = useRef<number | null>(null);

  // Read latest derived state on every render. Cheap — sessionStorage parse.
  const state = computeState(readHistory(), config);

  // While locked, tick once a second so the countdown updates without us
  // having to push state.
  useEffect(() => {
    if (state.lockedUntil == null) return;
    tickRef.current = window.setInterval(() => { force((n) => n + 1); }, 1000);
    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current);
    };
  }, [state.lockedUntil]);

  const recordFail = () => {
    const next = [...readHistory(), { at: Date.now(), ok: false }];
    writeHistory(next);
    force((n) => n + 1);
  };
  const recordSuccess = () => {
    const next = [...readHistory(), { at: Date.now(), ok: true }];
    writeHistory(next);
    force((n) => n + 1);
  };
  const clear = () => {
    writeHistory([]);
    force((n) => n + 1);
  };

  return { ...state, recordFail, recordSuccess, clear };
}

function computeState(history: Attempt[], cfg: RateLimitConfig): RateLimitState {
  const now = Date.now();
  const recent = history.filter((a) => now - a.at < cfg.windowMs);
  const fails = recent.filter((a) => !a.ok);

  // If the most recent fail exceeded threshold, lockout starts at that fail's
  // timestamp + cooldownMs. We re-compute every render so a passing tick
  // automatically lifts the lock.
  const triggeringFail = fails.length >= cfg.maxFails ? fails[fails.length - 1] : null;
  const lockedUntil =
    triggeringFail && now - triggeringFail.at < cfg.cooldownMs
      ? triggeringFail.at + cfg.cooldownMs
      : null;
  const cooldownSec = lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : 0;

  return {
    attempts: fails.length,
    remaining: Math.max(0, cfg.maxFails - fails.length),
    lockedUntil,
    cooldownSec,
  };
}
