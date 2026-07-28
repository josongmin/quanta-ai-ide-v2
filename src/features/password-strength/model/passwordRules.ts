// Pure password evaluation: strength score + per-rule satisfaction + a
// local "commonly-used" heuristic (matching a small built-in list of
// well-known weak passwords). The UI binds to the returned shape so it can
// show per-rule check chips next to the strength meter.
//
// IMPORTANT — this is a CLIENT-SIDE ADVISORY only. It is a minimum bar to
// stop the most trivial passwords and to give the user live feedback; it is
// NOT a security boundary and NOT a breach lookup. The backend is the FINAL
// authority on whether a password is acceptable (real HIBP/k-anonymity range
// check, server-side policy, rate limiting). Never treat `meetsClientPolicy`
// or a high `score` here as proof a password is safe.

import { clamp } from '@shared/lib';

export type PasswordRule = {
  id: 'length' | 'mixed' | 'digit' | 'symbol' | 'no-name';
  label: string;
  pass: boolean;
};

export type PasswordReport = {
  score: 0 | 1 | 2 | 3 | 4;     // 0 empty, 1 weak, 2 fair, 3 good, 4 strong
  label: 'Empty' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  rules: PasswordRule[];
  // True when the password matches our small built-in list of commonly-used
  // passwords. This is a LOCAL heuristic, not a real breach-database hit.
  commonlyUsed: boolean;
  estimateGuesses: string;      // human-readable estimate (e.g. "days")
  // Whether this password clears the client-side minimum bar. Advisory only —
  // the server has the final say.
  meetsPolicy: boolean;
};

// Small built-in list of very common passwords. This is a convenience
// heuristic bundled with the client — it is NOT sourced from any breach
// corpus and must never be presented to the user as a breach-database lookup.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'iloveyou1', 'welcome123', 'abc123456', 'letmein123', 'admin1234',
  'monkey1234', 'dragon123', 'sunshine1', 'football1', 'baseball1', 'master123',
]);

const MIN_LENGTH = 12;

// Count how many distinct character classes appear (lower/upper/digit/symbol).
function characterClasses(pw: string): number {
  let n = 0;
  if (/[a-z]/.test(pw)) n += 1;
  if (/[A-Z]/.test(pw)) n += 1;
  if (/\d/.test(pw)) n += 1;
  if (/[^A-Za-z0-9]/.test(pw)) n += 1;
  return n;
}

// Membership test against the built-in common-password list. Exposed so the UI
// and callers can share the exact same check.
export function isCommonPassword(pw: string): boolean {
  return COMMON_PASSWORDS.has(pw.toLowerCase());
}

// Client-side minimum bar. ADVISORY — the backend remains the final authority.
// Rejects:
//   - anything shorter than MIN_LENGTH,
//   - single-character-class strings no matter how long ("weak-but-long"),
//   - membership in the built-in common-password list.
// A password that clears this bar is *plausibly* acceptable, not "strong".
export function meetsClientPolicy(pw: string, name = ''): boolean {
  if (pw.length < MIN_LENGTH) return false;
  if (isCommonPassword(pw)) return false;
  // Reject single-class passwords (e.g. 16 lowercase letters). Length alone is
  // never sufficient — require at least two character classes.
  if (characterClasses(pw) < 2) return false;
  // Don't let the password just be the user's name repeated/embedded.
  const namePart = name.trim().toLowerCase().replace(/\s+/g, '');
  if (namePart.length >= 3 && pw.toLowerCase().includes(namePart)) return false;
  return true;
}

export function evaluatePassword(pw: string, name = ''): PasswordReport {
  if (pw.length === 0) {
    return {
      score: 0, label: 'Empty', rules: ruleSet(pw, name), commonlyUsed: false,
      estimateGuesses: '—', meetsPolicy: false,
    };
  }

  const rules = ruleSet(pw, name);
  const passed = rules.filter((r) => r.pass).length;
  const classes = characterClasses(pw);

  // Base score = how many rules are satisfied, clamped to 1..4.
  let score = clamp(passed, 1, 4) as 0 | 1 | 2 | 3 | 4;

  // Length can ADD a little credit, but only when the password already mixes
  // character classes. A single-class string ("aaaa…") never earns length
  // credit — length alone must not read as "strong".
  if (pw.length >= 16 && classes >= 3 && score < 4) {
    score = (score + 1) as 0 | 1 | 2 | 3 | 4;
  }

  // Cap the score by character-class diversity so a long single-class or
  // two-class password can never claim to be "Strong" on length alone.
  //   1 class  -> max Weak (1)
  //   2 classes -> max Fair (2)
  //   3 classes -> max Good (3)
  const classCap = (classes <= 1 ? 1 : classes === 2 ? 2 : classes === 3 ? 3 : 4) as 0 | 1 | 2 | 3 | 4;
  if (score > classCap) score = classCap;

  const commonlyUsed = isCommonPassword(pw);
  if (commonlyUsed) score = 1;  // common overrides — no matter how complex it looks.

  const label = (['Empty', 'Weak', 'Fair', 'Good', 'Strong'] as const)[score];

  return {
    score, label, rules, commonlyUsed,
    estimateGuesses: estimate(pw),
    meetsPolicy: meetsClientPolicy(pw, name),
  };
}

function ruleSet(pw: string, name: string): PasswordRule[] {
  const namePart = name.trim().toLowerCase().replace(/\s+/g, '');
  return [
    { id: 'length',  label: `At least ${MIN_LENGTH} characters`,  pass: pw.length >= MIN_LENGTH },
    { id: 'mixed',   label: 'Mix of upper and lower case',     pass: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { id: 'digit',   label: 'Includes a number',               pass: /\d/.test(pw) },
    { id: 'symbol',  label: 'Includes a symbol',               pass: /[^A-Za-z0-9]/.test(pw) },
    { id: 'no-name', label: "Doesn't contain your name",       pass: namePart.length < 3 || !pw.toLowerCase().includes(namePart) },
  ];
}

// Crude entropy estimate just to give the user something concrete on the
// page. Same shape Bitwarden/1Password show on their meter.
function estimate(pw: string): string {
  let alphabet = 0;
  if (/[a-z]/.test(pw)) alphabet += 26;
  if (/[A-Z]/.test(pw)) alphabet += 26;
  if (/\d/.test(pw)) alphabet += 10;
  if (/[^A-Za-z0-9]/.test(pw)) alphabet += 32;
  if (alphabet === 0) return '—';
  const bits = Math.log2(Math.max(2, alphabet)) * pw.length;
  if (bits < 28) return '< 1 second';
  if (bits < 36) return 'minutes';
  if (bits < 60) return 'days';
  if (bits < 80) return 'centuries';
  return 'aeons';
}
