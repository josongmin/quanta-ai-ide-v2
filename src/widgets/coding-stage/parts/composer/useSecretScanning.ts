import { useCallback, useMemo, useState } from 'react';
import { scanForSecrets, redactText, type SecretMatch } from '@shared/lib';

// Secret guard: scan on every change. Critical matches block submit
// until the user explicitly resolves; warn matches surface a soft
// toast that allows send-as-is. Pattern from GitHub Secret Scanning
// in editor + Slack DLP.
//
// Extracted from Composer.tsx without behavioural change — same memo
// dependencies, same submit-gating, same requestAnimationFrame deferral.
export function useSecretScanning(
  draft: string,
  onChange: (v: string) => void,
  onSubmit: () => void,
) {
  const secretMatches = useMemo<SecretMatch[]>(() => scanForSecrets(draft), [draft]);
  const criticalSecrets = useMemo(
    () => secretMatches.filter((m) => m.pattern.severity === 'critical'),
    [secretMatches],
  );
  const warnSecrets = useMemo(
    () => secretMatches.filter((m) => m.pattern.severity === 'warn'),
    [secretMatches],
  );
  // Modal state: null = no challenge; { …matches } = block-or-mask
  // dialog floats above the composer until the user resolves.
  const [secretChallenge, setSecretChallenge] = useState<{ matches: SecretMatch[]; mode: 'block' | 'warn' } | null>(null);
  const [warnDismissed, setWarnDismissed] = useState(false);

  // Guarded submit: block on critical, soft-warn once on warn-severity,
  // pass through after user dismisses or masks. The mask path edits the
  // draft *first* (so the user sees what's about to be sent) and lets
  // the next keystroke or click trigger the actual submit.
  const guardedSubmit = useCallback(() => {
    if (criticalSecrets.length > 0) {
      setSecretChallenge({ matches: criticalSecrets, mode: 'block' });
      return;
    }
    if (warnSecrets.length > 0 && !warnDismissed) {
      setSecretChallenge({ matches: warnSecrets, mode: 'warn' });
      return;
    }
    onSubmit();
  }, [criticalSecrets, warnSecrets, warnDismissed, onSubmit]);

  function maskAndSend() {
    const all = [...criticalSecrets, ...warnSecrets];
    const { text } = redactText(draft, all);
    onChange(text);
    setSecretChallenge(null);
    // Defer one frame so the redacted draft paints before submit.
    requestAnimationFrame(() => { onSubmit(); });
  }

  function sendAsIs() {
    setSecretChallenge(null);
    setWarnDismissed(true);
    requestAnimationFrame(() => { onSubmit(); });
  }

  return {
    secretChallenge,
    setSecretChallenge,
    guardedSubmit,
    maskAndSend,
    sendAsIs,
  };
}
