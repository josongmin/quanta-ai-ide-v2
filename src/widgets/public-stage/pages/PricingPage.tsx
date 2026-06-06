import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PublicShell ,
  HeroBackdrop, Eyebrow, HeadlineGradient, CountUp, LogoMarquee,
  SectionHead, SeamDivider,
} from '@shared/ui/marketing';
import { PLANS, FAQ, CUSTOMERS } from '../parts/pricing/data';
import type { Cycle } from '../parts/pricing/types';
import {
  CycleToggle, TrustStat, Divider, SectionWrap, PrimaryCta, SecondaryCta,
} from '../parts/pricing/atoms';
import { PlanCard } from '../parts/pricing/PlanCard';
import { FeatureMatrix } from '../parts/pricing/FeatureMatrix';

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <PublicShell active="pricing" width="bleed">
      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[640px]" intensity={0.7} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-16 flex flex-col items-center text-center gap-6">
          <Eyebrow>Pricing</Eyebrow>
          <HeadlineGradient accent="engineering rigor.">Pricing that scales with</HeadlineGradient>
          <p className="text-[16.5px] leading-relaxed max-w-[620px]" style={{ color: 'var(--fg-muted)' }}>
            Start free. Upgrade when admission gates, custom roles, or data residency
            become non-negotiable. No hidden seat minimums. No &quot;contact us&quot; for the
            features you actually need.
          </p>

          <CycleToggle value={cycle} onChange={setCycle} />

          {/* Trust strip — small stat row sitting on the hero */}
          <div className="flex items-center gap-8 mt-6 text-[12px]" style={{ color: 'var(--fg-muted)' }}>
            <TrustStat label="Active orgs"    value={<CountUp to={1284} />} />
            <Divider />
            <TrustStat label="Engineers shipping" value={<CountUp to={42392} format="compact" />} />
            <Divider />
            <TrustStat label="Median uptime" value="99.97%" />
          </div>
        </div>
      </section>

      {/* ─── PLAN GRID ──────────────────────────────────────────────── */}
      <section className="relative max-w-[1080px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
          {PLANS.map((p) => <PlanCard key={p.id} plan={p} cycle={cycle} />)}
        </div>
        <p className="text-[11px] mt-4 text-center" style={{ color: 'var(--fg-subtle)' }}>
          All plans include unlimited workspaces, public Git host integrations, and the open-source CLI.
        </p>
      </section>

      {/* ─── LOGO MARQUEE ──────────────────────────────────────────── */}
      <section className="mt-16">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] font-semibold mb-2" style={{ color: 'var(--fg-subtle)' }}>
          Engineering teams shipping with se.field
        </p>
        <LogoMarquee items={CUSTOMERS} />
      </section>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── FEATURE MATRIX ────────────────────────────────────────── */}
      <SectionWrap>
        <SectionHead
          eyebrow="Compare"
          title="Every feature, side-by-side."
          lede="No asterisks. No starter-edition footnotes. Here's exactly what you get on each plan."
        />
        <FeatureMatrix />
      </SectionWrap>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── FAQ ────────────────────────────────────────────────────── */}
      <SectionWrap narrow>
        <SectionHead
          eyebrow="FAQ"
          title="The questions sales gets every week."
          lede="If your question isn't here, the answer is probably 'yes' — but email us anyway and we'll add it to the page."
        />
        <div className="flex flex-col gap-2">
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => { setOpenFaq(open ? null : i); }}
                className="flex flex-col text-left rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-[14.5px] font-semibold" style={{ color: 'var(--fg-strong)' }}>
                    {f.q}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform shrink-0"
                    style={{
                      color: 'var(--fg-muted)',
                      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </div>
                {open && (
                  <div className="px-5 pb-4 -mt-1 text-[13.5px] leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                    {f.a}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </SectionWrap>

      <SectionWrap><SeamDivider /></SectionWrap>

      {/* ─── CTA BAND ───────────────────────────────────────────────── */}
      <SectionWrap>
        <div
          className="relative overflow-hidden rounded-2xl px-10 py-12 flex flex-col items-center text-center gap-5"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 50% 0%, color-mix(in srgb, var(--fg-accent) 22%, transparent), transparent 70%), var(--bg-canvas)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Eyebrow>Get started</Eyebrow>
          <h2 className="text-[28px] sm:text-[34px] leading-tight font-semibold tracking-[-0.018em] max-w-[640px]" style={{ color: 'var(--fg-strong)' }}>
            Start free. Upgrade when you&apos;re ready.
          </h2>
          <p className="text-[14.5px] leading-relaxed max-w-[520px]" style={{ color: 'var(--fg-muted)' }}>
            14 days to evaluate every paid feature. No card. No silent conversion. Cancel inside the app — no email needed.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <PrimaryCta>Start for free</PrimaryCta>
            <SecondaryCta>Talk to sales</SecondaryCta>
          </div>
        </div>
      </SectionWrap>
    </PublicShell>
  );
}
