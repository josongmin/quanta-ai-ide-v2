import { useEffect, useState } from 'react';

export function OwnerBanner({ message }: { message: string | null }) {
  const [visible, setVisible] = useState<string | null>(message);

  useEffect(() => {
    setVisible(message);
  }, [message]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(null), 5000);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="px-3 py-1.5 shrink-0"
      style={{
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--bg-surface-muted)',
        color: 'var(--fg-default)',
        fontSize: 11,
      }}
    >
      {visible}
    </div>
  );
}
