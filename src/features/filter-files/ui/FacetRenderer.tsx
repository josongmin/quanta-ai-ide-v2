import { Lock } from 'lucide-react';
import { useFilter, useFilterStore } from '@entities/filter-state';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { usePrefs } from '@features/tweak-prefs';
import MetricRangeSlider from './MetricRangeSlider';
import type { Facet, RangeFacet, BoolFacet, ToggleFacet, EnumFacet } from '@entities/facet';

type Props = { facet: Facet };

export default function FacetRenderer({ facet }: Props) {
  const prefs = usePrefs();
  const { isDark: dark } = useTheme();

  const unlocked = prefs.isUnlocked(facet);
  if (!unlocked) return <LockedRow facet={facet} dark={dark} />;

  if (facet.kind === 'range') return <RangeRow facet={facet} />;
  if (facet.kind === 'bool') return <BoolRow facet={facet} dark={dark} />;
  if (facet.kind === 'toggle') return <TriToggleRow facet={facet} dark={dark} />;
  if (facet.kind === 'enum') return <EnumRow facet={facet} dark={dark} />;
  return null;
}

function LockedRow({ facet, dark }: { facet: Facet; dark: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-xl mb-2 ${
      dark ? 'bg-white/[0.03] text-white/30' : 'bg-black/[0.03] text-black/30'
    }`}>
      <Lock className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] truncate">{facet.label}</span>
      <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-md uppercase font-black bg-[color:var(--bg-surface)] text-[color:var(--fg-muted)]">{facet.requiredPlan}</span>
    </div>
  );
}

function RangeRow({ facet }: { facet: RangeFacet }) {
  const key = facet.rangeKey;
  // Narrow selectors — each range row subscribes only to its own slice and
  // the (immutable) ranges bounds, so a churn-slider tweak doesn't re-render
  // every other RangeRow on the panel.
  const bounds = useFilterStore((s) => s.repo.ranges[key]);
  const value = useFilterStore((s) => s.state[key]);
  const setRange = useFilterStore((s) => s.setRange);
  return (
    <MetricRangeSlider
      label={facet.label}
      bounds={bounds}
      value={value}
      onChange={(r) => { setRange(key, r); }}
      step={facet.step}
      format={facet.format}
    />
  );
}

function BoolRow({ facet, dark }: { facet: BoolFacet; dark: boolean }) {
  const { t } = useTranslation('filter');
  // Narrow selectors — each toggle subscribes only to its own bool slice.
  const v = useFilterStore((s) => s.state[facet.boolKey]);
  const setBool = useFilterStore((s) => s.setBool);
  return (
    <button type="button"
      onClick={() => { setBool(facet.boolKey, !v); }}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border transition-colors ${
        v
          ? (dark ? 'bg-[#4f9a5c]/15 border-[#4f9a5c]/40 text-white' : 'bg-[#4f9a5c]/15 border-[#4f9a5c]/50 text-black')
          : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-active)]'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] truncate">{facet.label}</span>
      <span className={`text-[9px] font-mono ${v ? '' : 'opacity-50'}`}>{v ? t('toggle.on') : t('toggle.off')}</span>
    </button>
  );
}

function TriToggleRow({ facet, dark }: { facet: ToggleFacet; dark: boolean }) {
  const { t } = useTranslation('filter');
  const f = useFilter();
  // publicApiOnly is bool; others are tri-state (null/true/false)
  if (facet.toggleKey === 'publicApiOnly') {
    const v = f.state.publicApiOnly;
    return (
      <button type="button"
        onClick={() => { f.setPublicApiOnly(!v); }}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border ${
          v ? (dark ? 'bg-[#4f9a5c]/15 border-[#4f9a5c]/40 text-white' : 'bg-[#4f9a5c]/15 border-[#4f9a5c]/50 text-black')
            : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)]'
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{facet.label}</span>
        <span className="text-[9px] font-mono">{v ? t('toggle.on') : t('toggle.off')}</span>
      </button>
    );
  }
  const stateGetter = facet.toggleKey === 'isTest' ? f.state.isTest
    : facet.toggleKey === 'isGenerated' ? f.state.isGenerated
    : f.state.isDeprecated;
  const setter = facet.toggleKey === 'isTest' ? f.setIsTest
    : facet.toggleKey === 'isGenerated' ? f.setIsGenerated
    : f.setIsDeprecated;

  const cycle = () => {
    if (stateGetter === null) setter(true);
    else if (stateGetter) setter(false);
    else setter(null);
  };
  const labelFor = stateGetter === null ? t('toggle.any') : stateGetter ? t('toggle.only') : t('toggle.exclude');
  const styleOn = stateGetter !== null;
  return (
    <button type="button"
      onClick={cycle}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border transition-colors ${
        styleOn
          ? (dark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
          : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-active)]'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] truncate">{facet.label}</span>
      <span className={`text-[9px] font-mono uppercase ${styleOn ? '' : 'opacity-50'}`}>{labelFor}</span>
    </button>
  );
}

function EnumRow({ facet, dark }: { facet: EnumFacet; dark: boolean }) {
  const f = useFilter();
  const options =
    facet.enumKey === 'owners' ? f.repo.owners
    : facet.enumKey === 'languages' ? (facet.options ?? ['ts', 'tsx', 'js'])
    : (facet.options ?? ['view', 'controller', 'service', 'repository', 'util', 'test', 'vendor']);
  const selected =
    facet.enumKey === 'languages' ? (f.state.languages as Set<string>)
    : facet.enumKey === 'layers' ? (f.state.layers as Set<string>)
    : f.state.owners;
  const toggle = (v: string) => {
    if (facet.enumKey === 'languages') f.toggleLanguage(v as never);
    else if (facet.enumKey === 'layers') f.toggleLayer(v as never);
    else f.toggleOwner(v);
  };
  return (
    <div className="mb-2">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5 text-[color:var(--fg-subtle)]">
        {facet.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.has(o);
          return (
            <button type="button"
              key={o}
              onClick={() => { toggle(o); }}
              className={`text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-md border transition-colors ${
                active
                  ? (dark ? 'bg-white text-black border-white' : 'bg-black text-white border-black')
                  : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-active)]'
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
