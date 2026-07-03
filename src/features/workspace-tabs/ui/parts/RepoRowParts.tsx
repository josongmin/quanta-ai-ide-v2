import { type CSSProperties } from 'react';
import { formatCount } from './addTabData';

export function DiffBar({ added, removed }: { added: number; removed: number }) {
  const total = Math.max(1, added + removed);
  const addedPct = (added / total) * 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-[4px] w-[52px] rounded-full overflow-hidden"
        style={{ background: 'var(--bg-surface-muted)' }}
      >
        <span style={{ width: `${addedPct}%`, background: 'var(--intent-success-vivid)' }} />
        <span style={{ width: `${100 - addedPct}%`, background: 'var(--intent-danger-vivid)' }} />
      </span>
      <span className="font-mono text-2xs" style={{ color: 'var(--intent-success-vivid)' }}>
        +{formatCount(added)}
      </span>
      <span className="font-mono text-2xs" style={{ color: 'var(--intent-danger-vivid)' }}>
        −{formatCount(removed)}
      </span>
    </span>
  );
}

export function BadgeChip({ badge }: { badge: { label: string; tone: 'merged' | 'rebased' | 'cve' | 'tag' } }) {
  const TONES: Record<typeof badge.tone, { bg: string; fg: string; border: string }> = {
    merged: { bg: 'rgba(118, 156, 219, 0.14)', fg: '#7baaea', border: 'rgba(118, 156, 219, 0.4)' },
    rebased: { bg: 'rgba(214, 168, 92, 0.14)', fg: '#d4a460', border: 'rgba(214, 168, 92, 0.4)' },
    cve: { bg: 'rgba(220, 110, 110, 0.14)', fg: '#e08a8a', border: 'rgba(220, 110, 110, 0.4)' },
    tag: { bg: 'rgba(118, 156, 219, 0.14)', fg: '#7baaea', border: 'rgba(118, 156, 219, 0.4)' },
  };
  const tone = TONES[badge.tone];
  const style: CSSProperties = {
    background: tone.bg,
    color: tone.fg,
    border: `1px solid ${tone.border}`,
  };
  const prefix = badge.tone === 'cve' ? '⚠ ' : badge.tone === 'tag' ? '◇ ' : '';
  return (
    <span
      className="inline-flex items-center text-2xs font-mono px-1 py-px rounded"
      style={style}
    >
      {prefix}
      {badge.label}
    </span>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[2px] h-[18px]">
      {values.map((v, i) => {
        const h = Math.max(2, (v / max) * 18);
        const positive = i % 3 !== 1;
        return (
          <span
            key={i}
            style={{
              width: 3,
              height: h,
              background: positive ? 'var(--intent-success-vivid)' : 'var(--intent-danger-vivid)',
              borderRadius: 1,
              opacity: 0.8,
            }}
          />
        );
      })}
    </div>
  );
}

export function StatusDot({ status, label }: { status: 'changes' | 'clean' | 'review'; label: string }) {
  const COLOR: Record<typeof status, string> = {
    changes: '#d4a460',
    clean: 'var(--intent-success-vivid)',
    review: '#7baaea',
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: COLOR[status] }}>
      <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: COLOR[status] }} />
      {label}
    </span>
  );
}

export function BranchGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="3" cy="3" r="1.4" stroke="currentColor" strokeWidth="1" />
      <circle cx="3" cy="9" r="1.4" stroke="currentColor" strokeWidth="1" />
      <circle cx="9" cy="6" r="1.4" stroke="currentColor" strokeWidth="1" />
      <path d="M3 4.4 V7.6 M4.4 9 H7.6 C8.4 8.6 8.4 7.4 7.6 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}
