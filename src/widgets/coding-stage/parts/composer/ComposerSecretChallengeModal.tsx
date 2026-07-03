import { useEffect } from 'react';
import type { SecretMatch } from '@shared/lib';
import { useCodingStage } from '../../model/CodingStageContext';

// Extracted verbatim from Composer.tsx — byte-for-byte. A separate
// filename (not the pre-existing orphan composer/SecretChallengeModal.tsx,
// which uses a different visual treatment) so Composer's rendered output
// is unchanged.

// Secret guard modal. `block` mode forces a choice (mask or cancel);
// `warn` mode adds a third option ("send as-is") for soft PII matches
// the user may have pasted intentionally. Pattern: Slack DLP banner +
// 1Password vault paste warning.
export function SecretChallengeModal({
  matches, mode, onMaskAndSend, onSendAsIs, onCancel,
}: {
  matches: SecretMatch[];
  mode: 'block' | 'warn';
  onMaskAndSend: () => void;
  onSendAsIs: () => void;
  onCancel: () => void;
}) {
  const { t, isDark } = useCodingStage();
  // Esc cancels; Enter triggers mask-and-send (the safe default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Enter')  { e.preventDefault(); onMaskAndSend(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onCancel, onMaskAndSend]);

  const surface = 'bg-[var(--bg-elevated)] border-[color:var(--border-default)]';
  const heading = 'text-[color:var(--fg-strong)]';
  const muted = 'text-[color:var(--fg-muted)]';
  const toneStyle: React.CSSProperties = mode === 'block'
    ? {
        borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 40%, transparent)',
        background: 'color-mix(in srgb, var(--intent-danger-vivid) 8%, transparent)',
      }
    : {
        borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 40%, transparent)',
        background: 'color-mix(in srgb, var(--intent-warn-vivid) 8%, transparent)',
      };

  return (
    <div
      className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 rounded-xl border shadow-2xl overflow-hidden coding-pill-rise"
      style={isDark ? {
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      } : undefined}
    >
      <div style={toneStyle} className={`border rounded-xl ${surface}`}>
        <div className={`px-4 py-3`}>
          <div className={`flex items-center gap-2 mb-1.5`}>
            <span className="text-lg" aria-hidden>{mode === 'block' ? '🔐' : '⚠'}</span>
            <span className={`text-base font-bold ${heading}`}>
              {mode === 'block' ? t('secretGuard.blockTitle') : t('secretGuard.warnTitle')}
            </span>
          </div>
          <p className={`text-sm ${muted} mb-2`}>
            {t('secretGuard.blockBody', { count: matches.length })}
          </p>
          <ul className="space-y-1 mb-3">
            {matches.map((m, i) => (
              <li
                key={i}
                className="flex items-center gap-2 px-2 py-1 rounded-md text-sm font-mono bg-[color:var(--bg-surface-muted)]"
              >
                <span
                  style={{ background: m.pattern.severity === 'critical' ? 'var(--intent-danger-vivid)' : 'var(--intent-warn-vivid)' }}
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                />
                <span className={muted}>{t(`secretGuard.patterns.${m.pattern.id}`, { defaultValue: m.pattern.label })}</span>
                <span className={`ml-auto opacity-70 ${heading}`}>
                  {/* Show only first 4 chars + ellipsis. Reveal-once
                      could go here in a future iteration. */}
                  {m.value.slice(0, 4)}…
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              className={`px-2.5 py-1 rounded-md text-sm font-medium ${muted} hover:bg-[color:var(--bg-hover)]`}
            >
              {t('secretGuard.cancel')}
            </button>
            {mode === 'warn' && (
              <button
                type="button"
                onClick={onSendAsIs}
                className="px-2.5 py-1 rounded-md text-sm font-semibold bg-[color:var(--bg-active)] text-[color:var(--fg-strong)] hover:bg-[color:var(--bg-selected)] border border-[color:var(--border-default)]"
              >
                {t('secretGuard.sendAsIs')}
              </button>
            )}
            <button
              type="button"
              onClick={onMaskAndSend}
              style={{
                background: 'var(--intent-success-bg)',
                color: 'var(--intent-success-fg)',
                border: '1px solid color-mix(in srgb, var(--intent-success-vivid) 40%, transparent)',
              }}
              className="px-2.5 py-1 rounded-md text-sm font-semibold transition-colors"
            >
              {t('secretGuard.maskNow')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
