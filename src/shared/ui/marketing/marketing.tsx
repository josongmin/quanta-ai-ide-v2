import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { formatNumber } from '@shared/i18n';

// ─────────────────────────────────────────────────────────────────────────
// HeroBackdrop — animated mesh gradient + dotted grid overlay. Sits behind
// the hero content. The radial gradients drift slowly via CSS animation.
// Pure CSS, GPU-cheap, no JS per-frame work.
// ─────────────────────────────────────────────────────────────────────────

export function HeroBackdrop({
  height = 'h-[520px]',
  intensity = 0.6,
}: { height?: string; intensity?: number }) {
  // intensity scales the alpha of the gradient blobs so different pages can
  // dial it down (Status page wants subtler than Pricing).
  const a = (base: number) => Math.min(1, base * intensity).toFixed(3);
  return (
    <div
      aria-hidden
      className={`absolute inset-x-0 top-0 ${height} pointer-events-none overflow-hidden`}
      style={{
        // Layer order: mesh gradient (animated) → dot grid → bottom fade
        background: `
          radial-gradient(ellipse 80% 60% at 18% 28%, color-mix(in srgb, var(--brand-vivid) ${(parseFloat(a(0.42)) * 100).toFixed(1)}%, transparent), transparent 60%),
          radial-gradient(ellipse 60% 50% at 85% 12%, color-mix(in srgb, var(--fg-link) ${(parseFloat(a(0.34)) * 100).toFixed(1)}%, transparent), transparent 65%),
          radial-gradient(ellipse 70% 55% at 60% 80%, color-mix(in srgb, var(--intent-info-fg) ${(parseFloat(a(0.22)) * 100).toFixed(1)}%, transparent), transparent 70%)
        `,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--fg-strong) 9%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 30%, black, transparent 75%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, transparent, var(--bg-canvas))',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Eyebrow — small uppercase pill above the hero headline. Common pattern
// across all 4 marketing pages.
// ─────────────────────────────────────────────────────────────────────────

export function Eyebrow({
  children, tone = 'brand',
}: { children: ReactNode; tone?: 'brand' | 'success' | 'warn' | 'info' }) {
  const fg =
    tone === 'success' ? 'var(--intent-success-fg)'
    : tone === 'warn'  ? 'var(--intent-warn-fg)'
    : tone === 'info'  ? 'var(--intent-info-fg)'
    : 'var(--brand-fg)';
  const bg =
    tone === 'success' ? 'var(--intent-success-bg)'
    : tone === 'warn'  ? 'var(--intent-warn-bg)'
    : tone === 'info'  ? 'var(--intent-info-bg)'
    : 'var(--brand-bg)';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 h-6 text-[10px] uppercase tracking-[0.18em] font-semibold rounded-full"
      style={{
        background: bg,
        color: fg,
        border: `1px solid color-mix(in srgb, ${fg} 35%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HeadlineGradient — the big hero h1 with a subtle gradient sweep. The
// gradient sits in the middle words so it reads as accent, not a wall.
// ─────────────────────────────────────────────────────────────────────────

export function HeadlineGradient({
  children, accent,
}: { children: ReactNode; accent?: ReactNode }) {
  return (
    <h1
      className="text-[44px] sm:text-[56px] leading-[1.05] font-semibold tracking-[-0.022em]"
      style={{ color: 'var(--fg-strong)' }}
    >
      {children}
      {accent && (
        <>
          {' '}
          <span
            className="inline bg-clip-text"
            style={{
              backgroundImage:
                'linear-gradient(95deg, var(--brand-vivid), var(--fg-link) 60%, var(--intent-info-fg))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {accent}
          </span>
        </>
      )}
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// CountUp — animates a number from 0 → target on first viewport entry.
// ─────────────────────────────────────────────────────────────────────────

export function CountUp({
  to, durationMs = 1100, prefix = '', suffix = '', format = 'plain',
}: {
  to: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  format?: 'plain' | 'compact';
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / durationMs);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); };
  }, [to, durationMs]);

  const formatted = format === 'compact'
    ? compactNumber(n)
    : formatNumber(n);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

// ─────────────────────────────────────────────────────────────────────────
// LogoMarquee — auto-scrolling brand strip. CSS-only animation, pauses on
// hover so people can read individual marks.
// ─────────────────────────────────────────────────────────────────────────

export function LogoMarquee({ items }: { items: { label: string; mark: string }[] }) {
  // Duplicate the list so the loop can be seamless (translate -50%).
  const doubled = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden py-6"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
      }}
    >
      <div className="flex gap-12 whitespace-nowrap marquee-track">
        {doubled.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-2 shrink-0"
            style={{ color: 'var(--fg-subtle)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black"
              style={{
                background: 'color-mix(in srgb, var(--fg-strong) 8%, transparent)',
                border: '1px solid var(--border-muted)',
                color: 'var(--fg-muted)',
              }}
            >
              {it.mark}
            </div>
            <span className="text-[12px] font-semibold tracking-tight" style={{ color: 'var(--fg-muted)' }}>
              {it.label}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        .marquee-track {
          animation: marquee 36s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SectionLabel — uppercase label + headline + lede pattern shared across
// scroll-down sections.
// ─────────────────────────────────────────────────────────────────────────

export function SectionHead({
  eyebrow, title, lede, align = 'center',
}: { eyebrow?: string; title: ReactNode; lede?: ReactNode; align?: 'center' | 'left' }) {
  return (
    <div className={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : 'items-start text-left'} mb-10`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-[-0.018em] max-w-[680px]"
        style={{ color: 'var(--fg-strong)' }}
      >
        {title}
      </h2>
      {lede && (
        <p className="text-[14.5px] leading-relaxed max-w-[560px]" style={{ color: 'var(--fg-muted)' }}>
          {lede}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LiftCard — outlined card that hover-lifts. Used for plan grids, feature
// grids, category grids. The translate is 1.5px so it's perceptible but
// doesn't feel jumpy.
// ─────────────────────────────────────────────────────────────────────────

export function LiftCard({
  children, className = '', featured = false, style,
}: { children: ReactNode; className?: string; featured?: boolean; style?: CSSProperties }) {
  return (
    <div
      className={`flex flex-col rounded-xl transition-all duration-200 ${className}`}
      style={{
        background: 'var(--bg-canvas)',
        border: featured
          ? '2px solid var(--brand-vivid)'
          : '1px solid var(--border-default)',
        boxShadow: featured
          ? '0 12px 40px -16px color-mix(in srgb, var(--brand-vivid) 40%, transparent)'
          : '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = featured
          ? '0 18px 50px -16px color-mix(in srgb, var(--brand-vivid) 50%, transparent)'
          : '0 8px 24px -10px color-mix(in srgb, var(--fg-strong) 18%, transparent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = featured
          ? '0 12px 40px -16px color-mix(in srgb, var(--brand-vivid) 40%, transparent)'
          : '0 1px 0 0 color-mix(in srgb, var(--fg-strong) 4%, transparent)';
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SeamDivider — gradient fade between sections so the page reads as
// distinct chapters instead of one infinite scroll.
// ─────────────────────────────────────────────────────────────────────────

export function SeamDivider() {
  return (
    <div
      aria-hidden
      className="h-px w-full my-2"
      style={{
        background:
          'linear-gradient(to right, transparent, var(--border-default) 20%, var(--border-default) 80%, transparent)',
      }}
    />
  );
}
