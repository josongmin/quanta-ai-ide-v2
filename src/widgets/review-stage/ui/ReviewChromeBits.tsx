import { useRef } from 'react';
import { GitPullRequest, Sparkles } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { useDialogA11y } from '@shared/ui';

export function EmptyState() {
  const { t } = useTranslation('app');
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <GitPullRequest className="w-8 h-8 text-white/30" />
      <div className="text-[13px] font-bold text-white/70">{t('review.empty.noPrTitle')}</div>
      <div className="text-[11px] max-w-[320px] text-white/40">
        {t('review.empty.noPrSubtitle')}
      </div>
    </div>
  );
}

export function RailEmpty() {
  const { t } = useTranslation('app');
  return (
    <>
      <div className="shrink-0 h-11 flex items-center px-4 border-b border-white/[0.06]">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
          {t('review.rail.prContext')}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center text-[11px] text-white/40">
        {t('review.rail.nothingSelected')}
      </div>
    </>
  );
}

export function FooterHints() {
  const { t } = useTranslation('app');
  return (
    <div className="flex items-center justify-between gap-3 mt-2 px-1 py-3 text-[10px] font-mono text-white/30 border-t border-white/[0.04]">
      <span>{t('review.footer.left')}</span>
      <span className="flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {t('review.footer.right')}
      </span>
    </div>
  );
}

export function CheatSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('app');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y(dialogRef, true, onClose);
  const rows: { keys: string; desc: string }[] = [
    { keys: 'j / k',  desc: t('review.cheat.jk') },
    { keys: 'n / p',  desc: t('review.cheat.np') },
    { keys: 'v',      desc: t('review.cheat.v') },
    { keys: 'r',      desc: t('review.cheat.r') },
    { keys: 'a',      desc: t('review.cheat.approve', { defaultValue: 'Approve the active PR' }) },
    { keys: 'x',      desc: t('review.cheat.requestChanges', { defaultValue: 'Request changes on the active PR' }) },
    { keys: 'g o',    desc: t('review.cheat.go') },
    { keys: 'g f',    desc: t('review.cheat.gf') },
    { keys: 'g r',    desc: t('review.cheat.gr') },
    { keys: 'g c',    desc: t('review.cheat.gc') },
    { keys: 'g a',    desc: t('review.cheat.ga') },
    { keys: '?',      desc: t('review.cheat.q') },
  ];
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55">
      <button
        type="button"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('review.cheat.title', { defaultValue: 'Keyboard shortcuts' })}
        tabIndex={-1}
        className="relative min-w-[380px] max-w-[480px] rounded-2xl p-5 outline-none"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
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
