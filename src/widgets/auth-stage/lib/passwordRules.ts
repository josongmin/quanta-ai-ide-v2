// Pure password evaluation: strength score + per-rule satisfaction + a
// deterministic "breached" flag for demo purposes (matching a small set of
// known-bad passwords). The UI binds to the returned shape so it can show
// per-rule check chips next to the strength meter.

export type PasswordRule = {
  id: 'length' | 'mixed' | 'digit' | 'symbol' | 'no-name';
  label: string;
  pass: boolean;
};

export type PasswordReport = {
  score: 0 | 1 | 2 | 3 | 4;     // 0 empty, 1 weak, 2 fair, 3 good, 4 strong
  label: 'Empty' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  rules: PasswordRule[];
  breached: boolean;            // matched against demo blacklist
  estimateGuesses: string;      // human-readable estimate (e.g. "10²⁰ guesses")
};

const COMMON_BREACHED = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwertyuiop', 'iloveyou1', 'welcome123', 'abc123456', 'letmein123', 'admin1234',
  'monkey1234', 'dragon123', 'sunshine1', 'football1', 'baseball1', 'master123',
]);

export function evaluatePassword(pw: string, name = ''): PasswordReport {
  if (pw.length === 0) {
    return {
      score: 0, label: 'Empty', rules: ruleSet(pw, name), breached: false,
      estimateGuesses: '—',
    };
  }

  const rules = ruleSet(pw, name);
  const passed = rules.filter((r) => r.pass).length;

  // Score: 1 + extra credit for length over 16. Min 1, max 4.
  let score = Math.max(1, Math.min(4, passed)) as 0 | 1 | 2 | 3 | 4;
  if (pw.length >= 16 && score < 4) score = (score + 1) as 0 | 1 | 2 | 3 | 4;

  const breached = COMMON_BREACHED.has(pw.toLowerCase());
  if (breached) score = 1;  // breached overrides — no matter how complex it looks.

  const label = (['Empty', 'Weak', 'Fair', 'Good', 'Strong'] as const)[score];

  return {
    score, label, rules, breached,
    estimateGuesses: estimate(pw),
  };
}

function ruleSet(pw: string, name: string): PasswordRule[] {
  const namePart = name.trim().toLowerCase().replace(/\s+/g, '');
  return [
    { id: 'length',  label: 'At least 12 characters',          pass: pw.length >= 12 },
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
