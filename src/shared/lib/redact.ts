// Secret / PII detection.
//
// Patterns are seeded from the GitHub Secret Scanning published list
// (https://docs.github.com/en/code-security/secret-scanning/...) plus a
// short PII tail (email, SSN, credit card). High-entropy tokens get an
// extra Shannon-entropy gate so plain English ("this_is_my_password")
// doesn't false-positive.
//
// The module is intentionally side-effect free and synchronous so the
// composer can call it on every keystroke without async churn.

export type SecretSeverity = 'critical' | 'warn' | 'info';

export type SecretPattern = {
  id: string;
  label: string;
  regex: RegExp;
  // Shannon entropy gate. Patterns with structured prefixes (sk-…,
  // AKIA…) leave it at 0 — the prefix already constrains the match.
  // High-entropy generics like JWTs use 4.5+ to drop low-entropy hits.
  minEntropy?: number;
  severity: SecretSeverity;
};

// GitHub-published prefixes that already restrict the match enough that
// the prefix alone is signal — entropy gate is unnecessary.
export const BUILT_IN_PATTERNS: SecretPattern[] = [
  { id: 'openai-key',     label: 'OpenAI API key',
    regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, severity: 'critical' },
  { id: 'anthropic-key',  label: 'Anthropic API key',
    regex: /sk-ant-[A-Za-z0-9_-]{20,}/g, severity: 'critical' },
  { id: 'aws-access-key', label: 'AWS access key',
    regex: /AKIA[A-Z0-9]{16}/g, severity: 'critical' },
  { id: 'github-pat',     label: 'GitHub PAT',
    regex: /ghp_[A-Za-z0-9]{36}/g, severity: 'critical' },
  { id: 'jwt',            label: 'JWT',
    regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    minEntropy: 5.0, severity: 'critical' },

  // PII — never block, only warn. Users may legitimately paste sample
  // data; the toast is a nudge, not a roadblock.
  { id: 'email',          label: 'Email',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, severity: 'warn' },
  { id: 'us-ssn',         label: 'US SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: 'warn' },
  { id: 'credit-card',    label: 'Credit card',
    regex: /\b(?:\d[ -]*?){13,16}\b/g, minEntropy: 3.0, severity: 'warn' },
];

export type SecretMatch = {
  pattern: SecretPattern;
  value: string;
  start: number;
  end: number;
  redactedAs: string;
};

// Shannon entropy on a string. Used to drop low-entropy hits from
// high-entropy regexes (a 16-char number that's just zeros isn't a CC
// number; "password123" isn't a JWT). Pattern lifted from Trufflehog.
export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of freq.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function scanForSecrets(
  text: string,
  patterns: SecretPattern[] = BUILT_IN_PATTERNS,
): SecretMatch[] {
  const out: SecretMatch[] = [];
  for (const pat of patterns) {
    // Reset lastIndex on each loop — global regexes carry state across
    // calls and mutate findings if reused without reset.
    pat.regex.lastIndex = 0;
    for (const m of text.matchAll(pat.regex)) {
      const value = m[0];
      const start = m.index ?? 0;
      if (pat.minEntropy != null && shannonEntropy(value) < pat.minEntropy) continue;
      out.push({
        pattern: pat,
        value,
        start,
        end: start + value.length,
        redactedAs: `[REDACTED:${pat.id}]`,
      });
    }
  }
  // Sort so callers can reason about ordered ranges (composer overlay
  // and replacement both depend on left-to-right order).
  out.sort((a, b) => a.start - b.start);
  return out;
}

// Replace every match with its redacted placeholder. Returns the new
// string + a parallel list of (placeholder, original) so the parent
// can surface a one-shot Reveal-once affordance.
export function redactText(
  text: string,
  matches: SecretMatch[],
): { text: string; placeholders: { kind: string; placeholder: string; revealable: string; range: [number, number] }[] } {
  if (matches.length === 0) return { text, placeholders: [] };
  let cursor = 0;
  const out: string[] = [];
  const placeholders: { kind: string; placeholder: string; revealable: string; range: [number, number] }[] = [];
  for (const m of matches) {
    if (m.start < cursor) continue; // overlapping match, skip
    out.push(text.slice(cursor, m.start));
    const newStart = out.join('').length;
    out.push(m.redactedAs);
    placeholders.push({
      kind: m.pattern.id,
      placeholder: m.redactedAs,
      revealable: m.value,
      range: [newStart, newStart + m.redactedAs.length],
    });
    cursor = m.end;
  }
  out.push(text.slice(cursor));
  return { text: out.join(''), placeholders };
}
