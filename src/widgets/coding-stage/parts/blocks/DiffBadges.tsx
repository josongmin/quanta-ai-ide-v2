import { useEffect, useState } from 'react';
import type { CodingFileChange } from '../types';

// Working-tree drift badge. State-coloured chip that surfaces what kind
// of drift was detected and how to resolve it. Colour mapping follows
// the same lineage as VCS UIs: amber overlap (review), sky shifted
// (auto-rebase OK), rose gone (file deleted).
export function DriftBadge({
  drift, isDark, t,
}: {
  drift: NonNullable<CodingFileChange['drift']>;
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  void isDark;
  const tone =
    drift.state === 'overlap' ? ('bg-[var(--intent-warn-bg)] text-[var(--intent-warn-fg)] border-[var(--intent-warn-fg)]')
    : drift.state === 'gone'  ? ('bg-[var(--intent-danger-bg)] text-[var(--intent-danger-fg)] border-[var(--intent-danger-fg)]')
    :                            ('bg-sky-400/10 text-[var(--fg-link)] border-sky-400/30');
  const glyph =
    drift.state === 'overlap' ? '⚠'
    : drift.state === 'gone'  ? '✕'
    : '⊙';
  const label =
    drift.state === 'overlap' ? t('drift.fileOverlap')
    : drift.state === 'gone'  ? t('drift.fileGone')
    : t('drift.fileShifted');
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => { setNow(Date.now()); }, 60_000);
    return () => { window.clearInterval(id); };
  }, []);
  const ms = drift.workingShaLastTouchedAtMs;
  const ago = ms != null && now > 0
    ? `${Math.max(1, Math.round((now - ms) / 60_000))}m`
    : '';
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[9px] font-mono border ${tone}`}
      title={ago ? `${label} · ${t('drift.lastTouched', { ago })}` : label}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

// Tiny visual bar showing add/remove ratio. Caps at 5 segments total.
export function DiffBar({ added, removed, isDark }: { added: number; removed: number; isDark: boolean }) {
  void isDark;
  const total = added + removed;
  if (total === 0) return null;
  const segs = 5;
  const a = Math.round((added / total) * segs);
  const d = segs - a;
  const idle = 'bg-[var(--bg-active-strong)]';
  return (
    <div className="flex items-center gap-px ml-1">
      {Array.from({ length: a }).map((_, i) => (
        <span key={`a${i}`} className="w-1 h-1.5 rounded-sm" style={{ background: 'var(--intent-success-vivid)' }} />
      ))}
      {Array.from({ length: d }).map((_, i) => (
        <span
          key={`d${i}`}
          className={`w-1 h-1.5 rounded-sm ${i < removed ? '' : idle}`}
          style={i < removed ? { background: 'var(--intent-danger-vivid)' } : undefined}
        />
      ))}
    </div>
  );
}
