// Reusable row action menu for admin tables.

export function RowMenu({
  onClose, children,
}: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-30 bg-transparent border-0 p-0 cursor-default"
        onClick={onClose}
      />
      <div
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
