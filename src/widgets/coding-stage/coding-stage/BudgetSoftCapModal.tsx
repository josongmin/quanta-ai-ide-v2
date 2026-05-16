// Soft-cap budget modal. 3-choice paradigm — auto-downgrade (safe
// default), raise cap (expert override), stop (no spend). Pattern:
// AWS Budget threshold action + ATM overdraft warning.

import { useEffect } from 'react';
import type { ComposerModelId } from '../parts/Composer';

export function BudgetSoftCapModal({
  used, cap, primary, downgrade, isDark, t,
  onAutoDowngrade, onOverride, onStop,
}: {
  used: number;
  cap: number;
  primary: ComposerModelId;
  downgrade: ComposerModelId;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
  onAutoDowngrade: () => void;
  onOverride: () => void;
  onStop: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onStop(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [onStop]);
  const surface = isDark ? 'bg-[#11141a] border-white/[0.10]' : 'bg-white border-black/[0.10]';
  const heading = isDark ? 'text-white/90' : 'text-black/85';
  const muted = isDark ? 'text-white/55' : 'text-black/55';
  const newCap = (cap * 2).toFixed(2);
  const estDown = (used + 0.18).toFixed(2);
  // Prettify model id for display.
  const modelLabel = (id: ComposerModelId) => id.replace(/^claude-/, '').replace(/-(\d)/, ' $1').replace(/-/g, '.');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Dismiss"
        className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-black/20'} backdrop-blur-sm border-0 p-0 cursor-default`}
        onClick={onStop}
      />
      <div
        className={`relative w-full max-w-[480px] rounded-xl border shadow-2xl ${surface} coding-pill-rise`}
      >
        <div className="px-5 py-4">
          <div className={`flex items-center gap-2 mb-1`}>
            <span className="text-[16px]" aria-hidden>🛑</span>
            <h2 className={`text-[14px] font-bold ${heading}`}>{t('budgetV2.softCapModalTitle')}</h2>
          </div>
          <p className={`text-[12px] ${muted} mb-4`}>
            {t('budgetV2.softCapModalBody', { used: used.toFixed(2), cap: cap.toFixed(2) })}
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onAutoDowngrade}
              autoFocus
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/15 text-emerald-200'
                  : 'border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
              }`}
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapAutoDown', { model: modelLabel(downgrade), est: estDown })}
              </div>
            </button>
            <button
              type="button"
              onClick={onOverride}
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-amber-400/30 bg-amber-400/[0.06] hover:bg-amber-400/[0.10] text-amber-200'
                  : 'border-amber-500/30 bg-amber-50 hover:bg-amber-100 text-amber-700'
              }`}
            >
              <div className="text-[12px] font-semibold">
                {t('budgetV2.softCapOverride', { newCap })}
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">{modelLabel(primary)}</div>
            </button>
            <button
              type="button"
              onClick={onStop}
              className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                isDark
                  ? 'border-white/[0.10] hover:bg-white/[0.04] text-white/85'
                  : 'border-black/[0.10] hover:bg-black/[0.04] text-black/85'
              }`}
            >
              <div className="text-[12px] font-semibold">{t('budgetV2.softCapStop')}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
