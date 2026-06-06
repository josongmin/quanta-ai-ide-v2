import { ExternalLink } from 'lucide-react';
import { LiftCard } from '@shared/ui/marketing';

type ContactTone = 'brand' | 'success' | 'info';

const TONE_FG: Record<ContactTone, string> = {
  brand:   'var(--fg-accent)',
  success: 'var(--intent-success-fg)',
  info:    'var(--intent-info-fg)',
};

const TONE_BG: Record<ContactTone, string> = {
  brand:   'color-mix(in srgb, var(--fg-accent) 14%, transparent)',
  success: 'var(--intent-success-bg)',
  info:    'var(--intent-info-bg)',
};

export function ContactCard({
  icon: Icon, title, description, cta, tone,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  cta: string;
  tone: ContactTone;
}) {
  const fg = TONE_FG[tone];
  const bg = TONE_BG[tone];
  return (
    <LiftCard className="p-6 gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{
          background: bg,
          color: fg,
          border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
        }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{title}</span>
      <p className="text-[12px] leading-relaxed flex-1" style={{ color: 'var(--fg-muted)' }}>{description}</p>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[12px] font-semibold mt-2 bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: fg, font: 'inherit' }}
      >
        {cta} <ExternalLink className="w-3 h-3" />
      </button>
    </LiftCard>
  );
}
