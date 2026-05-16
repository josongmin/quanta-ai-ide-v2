import { useEffect } from 'react';
import type { SecretMatch } from '@shared/lib';

// Secret guard modal. `block` mode forces a choice (mask or cancel);
// `warn` mode adds a third option ("send as-is") for soft PII matches
// the user may have pasted intentionally. Pattern: Slack DLP banner +
// 1Password vault paste warning.
export function SecretChallengeModal({
  matches, mode, isDark, t, onMaskAndSend, onSendAsIs, onCancel,
}: {
  matches: SecretMatch[];
  mode: 'block' | 'warn';
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onMaskAndSend: () => void;
  onSendAsIs: () => void;
  onCancel: () => void;
}) {
  // Esc cancels; Enter triggers mask-and-send (the safe default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Enter')  { e.preventDefault(); onMaskAndSend(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onCancel, onMaskAndSend]);

  const surface = 'bg-[var(--bg-panel-strong)] border-[var(--border-strong)]';
  const heading = 'text-[var(--fg-strong)]';
  const muted = 'text-[var(--fg-muted)]';
  const tone = mode === 'block'
    ? 'border-[var(--intent-danger-fg)] bg-[var(--intent-danger-bg)]'
    : 'border-[var(--intent-warn-fg)] bg-[var(--intent-warn-bg)]';

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 rounded-xl border shadow-2xl overflow-hidden coding-pill-rise"
      style={isDark ? {
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      } : undefined}
    >
      <div className={`border ${tone} rounded-xl ${surface}`}>
        <div className={`px-4 py-3`}>
          <div className={`flex items-center gap-2 mb-1.5`}>
            <span className="text-[14px]" aria-hidden>{mode === 'block' ? '🔐' : '⚠'}</span>
            <span className={`text-[12px] font-bold ${heading}`}>
              {mode === 'block' ? t('secretGuard.blockTitle') : t('secretGuard.warnTitle')}
            </span>
          </div>
          <p className={`text-[11px] ${muted} mb-2`}>
            {t('secretGuard.blockBody', { count: matches.length })}
          </p>
          <ul className="space-y-1 mb-3">
            {matches.map((m, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono bg-[var(--bg-active)]`}
              >
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                  m.pattern.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <span className={muted}>{t(`secretGuard.patterns.${m.pattern.id}`, { defaultValue: m.pattern.label })}</span>
                <span className={`ml-auto opacity-70 ${heading}`}>
                  {m.value.slice(0, 4)}…
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${muted} hover:[background:var(--bg-hover)]`}
            >
              {t('secretGuard.cancel')}
            </button>
            {mode === 'warn' && (
              <button
                type="button"
                onClick={onSendAsIs}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors bg-[var(--bg-elevated)] text-[var(--fg-strong)] hover:[background:var(--bg-active-strong)] border border-[var(--border-strong)]`}
              >
                {t('secretGuard.sendAsIs')}
              </button>
            )}
            <button
              type="button"
              onClick={onMaskAndSend}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors bg-[var(--intent-success-bg)] text-emerald-200 hover:[background:var(--intent-success-bg)] border border-emerald-400/40`}
            >
              {t('secretGuard.maskNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
