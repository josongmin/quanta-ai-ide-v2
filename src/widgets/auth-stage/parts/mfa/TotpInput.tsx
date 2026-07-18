import { useEffect, useRef } from 'react';
import type { Phase } from './types';
import { DEMO_TOTP } from './types';

// TOTP — 6 single-digit boxes with paste, autofocus, error shake.

export function TotpInput({
  value, onChange, phase, demo = false,
}: { value: string[]; onChange: (v: string[]) => void; phase: Phase; demo?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const setAt = (i: number, ch: string) => {
    const digits = ch.replace(/\D/g, '');
    if (!digits) {
      const next = [...value]; next[i] = ''; onChange(next); return;
    }
    // Paste support: if user pastes "482917" into any box, fill from there.
    if (digits.length > 1) {
      const next = [...value];
      const start = i;
      for (let j = 0; j < digits.length && start + j < 6; j++) {
        next[start + j] = digits[j];
      }
      onChange(next);
      const lastFilled = Math.min(5, start + digits.length - 1);
      refs.current[Math.min(5, lastFilled + 1)]?.focus();
      return;
    }
    const next = [...value]; next[i] = digits.slice(-1); onChange(next);
    if (next[i] && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0)  refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const wrong = phase === 'wrong-code';
  const success = phase === 'success';

  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="text-xs uppercase tracking-eyebrow font-medium"
        style={{ color: 'var(--fg-subtle)' }}
      >
        Enter the 6-digit code from your app
      </span>
      <div
        className="flex gap-2"
        style={{
          animation: wrong ? 'onb-stagger 240ms reverse, totpShake 360ms' : undefined,
        }}
      >
        {value.map((v, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={i === 0 ? 6 : 1}  // first box accepts paste
            value={v}
            onChange={(e) => { setAt(i, e.target.value); }}
            onKeyDown={(e) => { onKey(i, e); }}
            disabled={success}
            className="w-11 h-12 text-center text-2xl font-semibold tabular-nums rounded-md outline-none transition-colors"
            style={{
              background: success ? 'var(--intent-success-bg)' : 'var(--bg-surface-muted)',
              border: `1px solid ${
                wrong ? 'var(--intent-danger-fg)'
                : success ? 'var(--intent-success-fg)'
                : v ? 'var(--fg-default)' : 'var(--border-default)'
              }`,
              color: success ? 'var(--intent-success-fg)' : 'var(--fg-strong)',
            }}
          />
        ))}
      </div>
      {demo && (
        <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
          Demo: code is <span className="font-mono" style={{ color: 'var(--fg-default)' }}>{DEMO_TOTP}</span>.
          Try anything else to see the wrong-code state.
        </span>
      )}
    </div>
  );
}
