import { Beaker, Flag, Wand2 } from 'lucide-react';
import type { PainPoint, TranslateFn } from './types';

export function PainPointsTab({
  painPoints, onDerive, isDark, t,
}: {
  painPoints: PainPoint[];
  onDerive: (p: PainPoint) => void;
  isDark: boolean;
  t: TranslateFn;
}) {
  void isDark;
  const heading = 'text-[var(--fg-strong)]';
  const muted   = 'text-[var(--fg-muted)]';
  const faint   = 'text-[var(--fg-subtle)]';

  return (
    <div className="px-5 py-4 space-y-3">
      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md bg-[var(--intent-warn-bg)] border border-[var(--intent-warn-fg)]`}>
        <Flag className={`shrink-0 w-4 h-4 mt-0.5 text-[var(--intent-warn-fg)]`} />
        <div className="space-y-0.5">
          <div className={`text-[12px] font-semibold text-[var(--intent-warn-fg)]`}>
            {t('agentProfile.painpoint.title')}
          </div>
          <div className={`text-[11px] leading-relaxed text-[var(--intent-warn-fg)]`}>
            {t('agentProfile.painpoint.intro')}
          </div>
        </div>
      </div>

      {painPoints.length === 0 ? (
        <div className={`text-[12px] ${faint} py-12 text-center`}>
          <Beaker className={`w-8 h-8 mx-auto mb-3 ${faint} opacity-50`} />
          {t('agentProfile.painpoint.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {painPoints.map((p) => (
            <div
              key={`${p.taskId}:${p.turnId}`}
              className={`rounded-lg border px-3.5 py-3 bg-[var(--bg-surface-muted)] border-[var(--border-default)]`}
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-semibold ${heading} truncate`}>
                    {p.taskTitle}
                  </div>
                  <div className={`text-[9px] font-mono uppercase tracking-[0.18em] ${faint}`}>
                    {t('agentProfile.painpoint.flagged', { at: p.at })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { onDerive(p); }}
                  className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors bg-[var(--intent-success-bg)] text-[var(--intent-success-fg)] border border-[var(--intent-success-fg)] hover:[background:var(--intent-success-bg)]`}
                >
                  <Wand2 className="w-3 h-3" />
                  {t('agentProfile.painpoint.deriveCta')}
                </button>
              </div>
              <p className={`text-[11px] leading-relaxed ${muted}`}>
                {p.preview}
              </p>
              {p.filesTouched.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {p.filesTouched.slice(0, 4).map((f) => (
                    <span key={f} className={`text-[10px] font-mono px-1.5 py-px rounded bg-[var(--bg-active)] text-[var(--fg-muted)]`}>{f}</span>
                  ))}
                  {p.filesTouched.length > 4 && (
                    <span className={`text-[10px] font-mono ${faint}`}>+{p.filesTouched.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
