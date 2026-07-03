import { PublicShell , HeroBackdrop, Eyebrow, SectionHead, SeamDivider } from '@shared/ui/marketing';
import { SERVICES, INCIDENTS } from '../parts/status/data';
import { worstOf, type Status } from '../parts/status/types';
import { PulseDot, UptimeStat, Divider, Legend } from '../parts/status/atoms';
import { RegionalMap } from '../parts/status/RegionalMap';
import { ServiceRow } from '../parts/status/ServiceRow';
import { IncidentCard } from '../parts/status/IncidentCard';
import { SubscribeBand } from '../parts/status/SubscribeBand';

export default function StatusPage() {
  // Overall = worst of any service
  const overall: Status = SERVICES.reduce<Status>((acc, s) => worstOf(acc, s.status), 'operational');

  return (
    <PublicShell active="status" width="bleed">
      {/* ─── HERO + OVERALL STATUS ─────────────────────────────────── */}
      <section className="relative">
        <HeroBackdrop height="h-[420px]" intensity={overall === 'operational' ? 0.5 : 0.7} />
        <div className="relative max-w-[1080px] mx-auto px-8 pt-20 pb-12 flex flex-col items-center text-center gap-5">
          <Eyebrow tone={overall === 'operational' ? 'success' : overall === 'degraded' ? 'warn' : 'brand'}>
            <PulseDot status={overall} />
            Live status
          </Eyebrow>

          <h1
            className="text-[40px] sm:text-[52px] leading-[1.05] font-semibold tracking-[-0.022em]"
            style={{ color: overall === 'operational' ? 'var(--intent-success-fg)' : overall === 'degraded' ? 'var(--intent-warn-fg)' : 'var(--intent-danger-fg)' }}
          >
            {overall === 'operational' ? 'All systems operational.' : overall === 'degraded' ? 'Some systems degraded.' : 'Major outage in progress.'}
          </h1>

          <p className="text-lg" style={{ color: 'var(--fg-muted)' }}>
            Updated <span className="font-mono">2026-05-11 17:42 UTC</span> · Refreshes every 60 seconds
          </p>

          <div className="flex items-center gap-6 mt-3 text-base" style={{ color: 'var(--fg-muted)' }}>
            <UptimeStat label="90-day uptime"  value="99.97%" />
            <Divider />
            <UptimeStat label="Last incident"  value="3 days ago" />
            <Divider />
            <UptimeStat label="MTTR (90d)"     value="14 min" />
          </div>
        </div>
      </section>

      {/* ─── REGIONAL MAP ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-2">
        <RegionalMap />
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-10"><SeamDivider /></div>

      {/* ─── SERVICE GRID ──────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12">
        <SectionHead
          eyebrow="Components"
          title="Health by component, last 90 days."
          lede="Each tile is one day. Hover to see the date and status. Anything not green gets a public incident."
          align="left"
        />

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-canvas)', border: '1px solid var(--border-default)' }}
        >
          {SERVICES.map((s, i) => (
            <ServiceRow key={s.id} service={s} idx={i} />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1 text-sm" style={{ color: 'var(--fg-subtle)' }}>
          <span>Last 90 days</span>
          <Legend color="var(--intent-success-fg)" label="Operational" />
          <Legend color="var(--intent-warn-fg)"    label="Degraded" />
          <Legend color="var(--intent-danger-fg)"  label="Outage" />
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-12"><SeamDivider /></div>

      {/* ─── INCIDENTS ─────────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12">
        <SectionHead
          eyebrow="Recent incidents"
          title="What broke. What we did. When it ended."
          lede="Public incidents are posted within 5 minutes. Postmortems land within 5 business days."
          align="left"
        />
        <div className="flex flex-col gap-3">
          {INCIDENTS.map((inc) => <IncidentCard key={inc.id} incident={inc} />)}
        </div>
      </section>

      <div className="max-w-[1080px] mx-auto px-8 mt-12"><SeamDivider /></div>

      {/* ─── SUBSCRIBE BAND ────────────────────────────────────────── */}
      <section className="max-w-[1080px] mx-auto px-8 mt-12 mb-12">
        <SubscribeBand />
      </section>
    </PublicShell>
  );
}
