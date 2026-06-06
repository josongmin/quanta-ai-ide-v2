import { VolumeX } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────
// Global-mute banner

export function MuteBanner() {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-md mb-4 onb-stagger"
      style={{
        background: 'var(--intent-warn-bg)',
        border: '1px solid var(--intent-warn-fg)',
      }}
    >
      <VolumeX className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--intent-warn-fg)' }} />
      <span className="text-[11px]" style={{ color: 'var(--fg-strong)' }}>
        All notifications are paused. Critical security alerts will still come through.
      </span>
    </div>
  );
}
