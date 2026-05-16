import { useEffect, useState } from 'react';

export function OwnerBanner({ message }: { message: string | null }) {
  const [visible, setVisible] = useState<string | null>(message);

  // Mirror prop into local state so the banner can auto-clear on its own
  // 5s timer while still resetting when the parent rotates the message.
  // A `key={message}` remount would lose the in-flight timer state, and
  // moving the timer to the parent would couple it to consumer logic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setVisible(message); }, [message]);

  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => { setVisible(null); }, 5000);
    return () => { window.clearTimeout(t); };
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
