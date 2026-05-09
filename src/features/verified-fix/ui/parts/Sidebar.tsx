import { AlertOctagon, Activity, Bell, Crosshair, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import type { FixCase, Seed, SeedKind } from '../../model/types';
import { useVfx } from './tokens';

const KIND_ICON: Record<SeedKind, LucideIcon> = {
  incident: AlertOctagon,
  hotspot:  Activity,
  alert:    Bell,
  focus:    Crosshair,
};

export function Sidebar({
  cases, seeds, activeCaseId, onSelect,
}: {
  cases: FixCase[];
  seeds: Record<string, Seed>;
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
}) {
  const t = useVfx();
  const { t: tr } = useTranslation('verified-fix');
  return (
    <aside
      className="shrink-0 w-[280px] h-full flex flex-col border-r"
      style={{
        background: t.sidebar,
        backdropFilter: t.sidebarBlur,
        WebkitBackdropFilter: t.sidebarBlur,
        borderColor: t.border,
      }}
    >
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: t.borderSoft }}
      >
        <div
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: t.textMuted }}
        >
          {tr('sidebar.brand')}
        </div>
        <div
          className="text-[12px] font-semibold mt-0.5"
          style={{ color: t.textHi }}
        >
          {tr('sidebar.title')}
        </div>
        <div className="text-[10px] mt-2" style={{ color: t.textFaint }}>
          {tr('sidebar.active', { count: cases.length })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto py-1.5">
        {cases.map((c) => {
          const seed = seeds[c.seedId];
          if (!seed) return null;
          const Icon = KIND_ICON[seed.kind];
          const active = c.id === activeCaseId;
          const candCount = c.candidates.length;
          const stage = c.loop.currentStage;
          const aborted = c.loop.aborted;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c.id); }}
              className="w-full text-left px-4 py-2.5 transition-colors"
              style={{
                background: active ? t.hoverActive : 'transparent',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = t.hoverSubtle; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-3 h-3 shrink-0" style={{ color: severityColor(seed.severity, t) }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: t.textMuted }}
                >
                  {tr(`header.kind.${seed.kind}`)}
                </span>
                <span className="ml-auto text-[9px] font-mono" style={{ color: t.textFaint }}>
                  {seed.age}
                </span>
              </div>
              <div
                className="text-[12px] mt-1 leading-snug"
                style={{ color: active ? t.textHi : t.textBody }}
              >
                {seed.title}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: aborted ? t.badSoft : stage === 'done' ? t.okSoft : t.badgeBg,
                    color: aborted ? t.bad : stage === 'done' ? t.ok : t.textMuted,
                  }}
                >
                  {aborted ? tr('sidebar.aborted') : tr(`loop.stage.${stage}`)}
                </span>
                <span className="text-[9px]" style={{ color: t.textFaint }}>
                  {candCount === 0
                    ? tr('sidebar.noCandidates')
                    : tr('sidebar.candidate', { count: candCount })}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="px-4 py-2.5 border-t text-[9px] font-mono"
        style={{ borderColor: t.borderSoft, color: t.textFaint }}
      >
        {tr('sidebar.footer')}
      </div>
    </aside>
  );
}

function severityColor(sev: Seed['severity'], t: ReturnType<typeof useVfx>) {
  switch (sev) {
    case 'crit': return t.bad;
    case 'high': return t.warn;
    case 'med':  return t.info;
    default:     return t.textSubtle;
  }
}
