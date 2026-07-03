import { useEffect, useRef, useState, type ComponentType } from 'react';
import { MoreHorizontal } from 'lucide-react';

// Row action menu used 5+ times across settings/admin tables: a MoreHorizontal
// trigger that toggles a positioned dropdown, with a transparent fixed
// click-catcher behind it for outside-click dismissal. Reproduces the existing
// markup exactly:
//   • trigger:   w-7 h-7 rounded-md, --fg-muted, hover → --bg-active
//   • catcher:   fixed inset-0 z-30 transparent button
//   • dropdown:  absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1,
//                --bg-elevated / --border-default / --shadow-md
//   • item:      px-3 (variant 'wide') or px-2.5, h-8, hover → --bg-hover,
//                danger → --intent-danger-fg, disabled → --fg-subtle
//
// Open state is internal; each item supplies its own onClick (the menu closes
// itself first). No business logic.

export type RowMenuItem = {
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  items: RowMenuItem[];
  ariaLabel?: string;
  /** Horizontal padding of items: 'tight' = px-2.5, 'wide' = px-3. */
  itemPadding?: 'tight' | 'wide';
  /** Color of the trigger glyph. Defaults to --fg-muted. */
  triggerColor?: string;
};

export function RowMenu({
  items, ariaLabel = 'Row actions', itemPadding = 'tight', triggerColor = 'var(--fg-muted)',
}: Props) {
  const [open, setOpen] = useState(false);
  const px = itemPadding === 'wide' ? 'px-3' : 'px-2.5';
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Move focus into the menu when it opens so keyboard users land on the
  // first actionable item (WAI-ARIA menu pattern).
  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus();
  }, [open]);

  const closeAndRestore = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeAndRestore(); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (nodes.length === 0) return;
    const idx = nodes.indexOf(document.activeElement as HTMLElement);
    const n = nodes.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); nodes[(idx + 1 + n) % n]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); nodes[(idx - 1 + n) % n]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); nodes[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); nodes[n - 1]?.focus(); }
  };

  return (
    <div className="relative flex justify-end">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors"
        style={{ color: triggerColor }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-active)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Dismiss menu"
            className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default"
            onClick={() => { setOpen(false); }}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={ariaLabel}
            onKeyDown={onMenuKeyDown}
            className="absolute right-0 top-full mt-1 z-40 min-w-[180px] py-1 rounded-md"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { setOpen(false); item.onClick?.(); }}
                  className={`flex items-center gap-2 w-full ${px} h-8 text-base transition-colors text-left`}
                  style={{
                    color: item.disabled
                      ? 'var(--fg-subtle)'
                      : item.danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)',
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    opacity: item.disabled ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!item.disabled) e.currentTarget.style.background = 'transparent'; }}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
