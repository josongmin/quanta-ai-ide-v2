import { ArrowUpRight, Sparkles, Cpu, Activity } from 'lucide-react';
import { GithubIcon } from '@shared/ui/brand-icons';
import { DeveloperShell } from '../parts/DeveloperShell';
import { PRIMARY, SECONDARY } from '../parts/overview/data';
import { SectionTitle, BigCard, SmallCard } from '../parts/overview/cards';
import { Quickstart } from '../parts/overview/Quickstart';
import { HealthStrip } from '../parts/overview/HealthStrip';

export default function DevOverviewPage() {
  return (
    <DeveloperShell
      title="Build on se.field"
      subtitle="The same API powers our app, your scripts, and every integration in the marketplace."
      topRight={
        <a
          href="https://github.com/acme/se-field"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-semibold transition-colors"
          style={{
            background: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--fg-strong)',
          }}
        >
          <GithubIcon className="w-3.5 h-3.5" />
          GitHub
          <ArrowUpRight className="w-3 h-3 opacity-60" />
        </a>
      }
    >
      {/* Three-up primary cards */}
      <div className="grid grid-cols-3 gap-3 mb-12">
        {PRIMARY.map((c) => (
          <BigCard key={c.to} card={c} />
        ))}
      </div>

      {/* Quickstart */}
      <section className="mb-12">
        <SectionTitle
          icon={Sparkles}
          title="Quickstart"
          hint="A request authenticated as you, in your preferred language."
        />
        <Quickstart />
      </section>

      {/* Secondary cards */}
      <section className="mb-12">
        <SectionTitle icon={Cpu} title="More tools" />
        <div className="grid grid-cols-3 gap-3">
          {SECONDARY.map((c) => (
            <SmallCard key={c.to} card={c} />
          ))}
        </div>
      </section>

      {/* Live API health strip */}
      <section className="mb-2">
        <SectionTitle icon={Activity} title="API health" hint="Past 24 hours" />
        <HealthStrip />
      </section>
    </DeveloperShell>
  );
}
