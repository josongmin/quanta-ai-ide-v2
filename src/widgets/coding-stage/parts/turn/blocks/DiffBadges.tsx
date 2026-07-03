import { useEffect, useState } from 'react';
import { useTabVisibility } from '@features/workspace-tabs';
import type { CodingFileChange } from '../../types';
import { useCodingStage } from '../../../model/CodingStageContext';

// Working-tree drift badge. State-coloured chip that surfaces what kind
// of drift was detected and how to resolve it. Colour mapping follows
// the same lineage as VCS UIs: amber overlap (review), sky shifted
// (auto-rebase OK), rose gone (file deleted).
export function DriftBadge({
  drift,
}: {
  drift: NonNullable<CodingFileChange['drift']>;
}) {
  const { t } = useCodingStage();
  const toneStyle: React.CSSProperties =
    drift.state === 'overlap' ? {
        background: 'var(--intent-warn-bg)',
        color: 'var(--intent-warn-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-warn-vivid) 30%, transparent)',
      }
    : drift.state === 'gone'  ? {
        background: 'var(--intent-danger-bg)',
        color: 'var(--intent-danger-fg)',
        borderColor: 'color-mix(in srgb, var(--intent-danger-vivid) 30%, transparent)',
      }
    : {
        background: 'var(--intent-info-bg)',
        color: 'var(--fg-link)',
        borderColor: 'color-mix(in srgb, var(--intent-info-fg) 30%, transparent)',
      };
  const glyph =
    drift.state === 'overlap' ? '⚠'
    : drift.state === 'gone'  ? '✕'
    : '⊙';
  const label =
    drift.state === 'overlap' ? t('drift.fileOverlap')
    : drift.state === 'gone'  ? t('drift.fileGone')
    : t('drift.fileShifted');
  // Format relative time for tooltip. We compute against `now` carried
  // in state so render is pure (the lint rule rejects Date.now in
  // render); the timestamp ticks in an effect once a minute.
  const [now, setNow] = useState<number>(0);
  const visible = useTabVisibility();
  /* eslint-disable react-hooks/set-state-in-effect --
   * Mirroring the wall clock into render state. Documented pattern. */
  useEffect(() => {
    if (!visible) return;
    setNow(Date.now());
    const id = window.setInterval(() => { setNow(Date.now()); }, 60_000);
    return () => { window.clearInterval(id); };
  }, [visible]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const ms = drift.workingShaLastTouchedAtMs;
  const ago = ms != null && now > 0
    ? `${Math.max(1, Math.round((now - ms) / 60_000))}m`
    : '';
  return (
    <span
      style={toneStyle}
      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-px rounded-md text-2xs font-mono border"
      title={ago ? `${label} · ${t('drift.lastTouched', { ago })}` : label}
    >
      <span aria-hidden>{glyph}</span>
      {label}
    </span>
  );
}

// Tiny visual bar showing add/remove ratio. Caps at 5 segments total.
export function DiffBar({ added, removed }: { added: number; removed: number }) {
  const total = added + removed;
  if (total === 0) return null;
  const segs = 5;
  const a = Math.round((added / total) * segs);
  const d = segs - a;
  const idle = 'bg-[color:var(--bg-active-strong)]';
  return (
    <div className="flex items-center gap-px ml-1">
      {Array.from({ length: a }).map((_, i) => (
        <span
          key={`a${i}`}
          style={{ background: 'color-mix(in srgb, var(--intent-success-vivid) 80%, transparent)' }}
          className="w-1 h-1.5 rounded-sm"
        />
      ))}
      {Array.from({ length: d }).map((_, i) => (
        <span
          key={`d${i}`}
          style={i < removed ? { background: 'color-mix(in srgb, var(--intent-danger-vivid) 70%, transparent)' } : undefined}
          className={`w-1 h-1.5 rounded-sm ${i < removed ? '' : idle}`}
        />
      ))}
    </div>
  );
}
