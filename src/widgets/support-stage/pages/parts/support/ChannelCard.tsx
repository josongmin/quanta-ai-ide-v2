import { useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { StatusDot } from '@shared/ui';

export function ChannelCard({
  icon: Icon, title, blurb, cta, href, tone, badge,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  blurb: string;
  cta: string;
  href?: string;
  tone: { from: string; to: string };
  badge?: string;
}) {
  // Shared props for either branch — split because TanStack's Link
  // requires `to` while plain <div> doesn't accept it.
  const commonClassName = 'rounded-xl p-5 flex flex-col gap-3 transition-all';
  const commonStyle: React.CSSProperties = {
    background: 'var(--bg-canvas)',
    border: '1px solid var(--border-default)',
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white"
          style={{ backgroundImage: `linear-gradient(135deg, ${tone.from}, ${tone.to})` }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <span
            className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-semibold"
            style={{ color: 'var(--intent-success-fg)', background: 'var(--intent-success-bg)' }}
          >
            <StatusDot intent="success" size="xs" pulse />
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: 'var(--fg-strong)' }}>{title}</h3>
      <p className="text-[12px] leading-snug" style={{ color: 'var(--fg-muted)' }}>{blurb}</p>
      <span
        className="text-[11px] font-semibold mt-1 inline-flex items-center gap-1"
        style={{ color: 'var(--fg-link)' }}
      >
        {cta} <ChevronRight className="w-3 h-3" />
      </span>
    </>
  );
  if (href) {
    return (
      <Link
        to={href as never}
        className={commonClassName}
        style={commonStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {inner}
      </Link>
    );
  }
  return (
    <ChannelCardDiv className={commonClassName} style={commonStyle}>
      {inner}
    </ChannelCardDiv>
  );
}

function ChannelCardDiv({
  className, style, children,
}: { className: string; style: React.CSSProperties; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnter = () => {
      el.style.transform = 'translateY(-2px)';
      el.style.boxShadow = '0 12px 30px -12px color-mix(in srgb, var(--fg-accent) 22%, transparent)';
    };
    const onLeave = () => {
      el.style.transform = 'translateY(0)';
      el.style.boxShadow = 'none';
    };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
