// ─────────────────────────────────────────────────────────────────────────
// CHEAT SHEET — Cmd+? modal listing every keyboard binding the surface
// supports. Backed by useDialogA11y for focus-trap and esc-to-close.
// ─────────────────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { useTranslation } from '@shared/i18n';
import { useDialogA11y } from '@shared/ui';

export default function CheatSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('app');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const rows: { keys: string; desc: string }[] = [
    { keys: 'j / k',  desc: t('review.cheat.jk') },
    { keys: 'n / p',  desc: t('review.cheat.np') },
    { keys: 'v',      desc: t('review.cheat.v') },
    { keys: 'r',      desc: t('review.cheat.r') },
    { keys: 'g o',    desc: t('review.cheat.go') },
    { keys: 'g f',    desc: t('review.cheat.gf') },
    { keys: 'g r',    desc: t('review.cheat.gr') },
    { keys: 'g c',    desc: t('review.cheat.gc') },
    { keys: 'g a',    desc: t('review.cheat.ga') },
    { keys: '?',      desc: t('review.cheat.q') },
  ];
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('review.cheat.title', { defaultValue: 'Keyboard shortcuts' })}
        tabIndex={-1}
        className="min-w-[380px] max-w-[480px] rounded-2xl p-5 outline-none"
        style={{
          backgroundColor: 'rgba(13, 17, 23, 0.95)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/85">
            Keyboard
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-mono text-white/40 hover:text-white"
          >
            esc
          </button>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {rows.map((r) => (
            <ShortcutRow key={r.keys} keys={r.keys} desc={r.desc} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <>
      <span className="flex items-center gap-1">
        {keys.split(' ').map((k, i) => (
          <kbd
            key={`${keys}-${String(i)}`}
            className="px-1.5 h-5 inline-flex items-center justify-center rounded-md border text-[10px] font-mono bg-white/[0.06] text-white/85 border-white/10"
          >
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-[12px] text-white/70">{desc}</span>
    </>
  );
}
