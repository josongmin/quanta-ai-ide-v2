import React, { useRef } from 'react';
import { C, type Tone } from '../lib/color';

export type TabSpec<T extends string> = {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badges?: { n: number; tone: Tone }[];
};

export function TabBar<T extends string>({
  tabs, active, onChange,
  // `isDark` retained for call-site compatibility; styling is now token-driven.
  isDark: _isDark,
}: {
  tabs: TabSpec<T>[];
  active: T;
  onChange: (id: T) => void;
  isDark?: boolean;
}) {
  // Horizontally scrollable when tabs overflow. Edge fade-masks hint at
  // hidden content. Active tab auto-scrolls into view on click so a tap on
  // a partially-hidden tab still brings it forward.
  const onTabClick = (id: T, ev: React.MouseEvent<HTMLButtonElement>) => {
    onChange(id);
    ev.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Roving tabindex: only the active tab is focusable from outside the
  // tablist; ArrowLeft/ArrowRight (with wrap) and Home/End move focus +
  // selection through the rest. Tab/Shift-Tab leaves the tablist entirely.
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((tab) => tab.id === active);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight') {
      next = (idx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      next = (idx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    const el = btnRefs.current[next];
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div
      className="shrink-0 relative border-b"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className="flex items-stretch overflow-x-auto scrollbar-hide"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
        }}
      >
        {tabs.map((t, i) => {
          const isActive = t.id === active;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => { btnRefs.current[i] = el; }}
              role="tab"
              type="button"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={(e) => { onTabClick(t.id, e); }}
              className="shrink-0 relative flex items-center justify-center gap-1.5 px-3 py-2 min-w-[88px] text-xs font-bold uppercase tracking-eyebrow transition-colors"
              style={{
                color: isActive ? 'var(--fg-strong)' : 'var(--fg-subtle)',
              }}
            >
              <Icon className="w-3 h-3" />
              <span>{t.label}</span>
              {t.badges && t.badges.length > 0 && (
                <span className="ml-0.5 inline-flex items-center gap-0.5">
                  {t.badges.map((b, i) => {
                    const c = b.tone === 'critical' ? C.critical : b.tone === 'warn' ? C.warning : C.ok;
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-2xs font-black tabular-nums"
                        style={{ background: `${c}22`, color: c }}
                      >
                        {b.n}
                      </span>
                    );
                  })}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full"
                  style={{ background: 'var(--fg-strong)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
