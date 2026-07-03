// Reusable row action menu for admin tables.

import { useRef } from 'react';
import { useRovingMenuFocus } from '@shared/lib';

export function RowMenu({
  onClose, children,
}: { onClose: () => void; children: React.ReactNode }) {
  const menuRef = useRef<HTMLDivElement>(null);
  // Mounts only while open, so focus-on-mount lands the user on the first item.
  const { onKeyDown: onRove } = useRovingMenuFocus(menuRef);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (onRove(e)) return;
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'Tab') onClose();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        role="menu"
        onKeyDown={onKeyDown}
        className="absolute right-0 top-full mt-1 z-40 min-w-[160px] py-1 rounded-md"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {children}
      </div>
    </>
  );
}

export function RowMenuItem({
  label, onClick, danger = false,
}: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center px-2.5 h-8 text-base text-left transition-colors"
      style={{ color: danger ? 'var(--intent-danger-fg)' : 'var(--fg-default)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
