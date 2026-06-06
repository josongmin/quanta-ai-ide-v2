import { Lock } from 'lucide-react';
import { useFilterStore } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import { usePrefs } from '@features/tweak-prefs';
import MetricRangeSlider from './MetricRangeSlider';
import {
  isBinaryToggle,
  useBinaryToggle,
  useTriToggle,
  useEnumFacet,
  type BinaryToggleFacet,
  type TriToggleFacet,
} from '../lib/facetAccessors';
import type { Facet, RangeFacet, BoolFacet, ToggleFacet, EnumFacet } from '@entities/facet';

type Props = { facet: Facet };

// Selected/active affordance — brand-tinted fill + ring + accent text.
// Per project convention this keeps the existing visual treatment; the
// accent hue is theme-aware via --fg-accent (not a flat grey fill).
const SELECTED_CLASS =
  'border-[color:var(--fg-accent)] text-[color:var(--fg-strong)] [background:color-mix(in_srgb,var(--fg-accent)_15%,transparent)]';
const IDLE_CLASS =
  'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-active)]';

export default function FacetRenderer({ facet }: Props) {
  const prefs = usePrefs();

  const unlocked = prefs.isUnlocked(facet);
  if (!unlocked) return <LockedRow facet={facet} />;

  if (facet.kind === 'range') return <RangeRow facet={facet} />;
  if (facet.kind === 'bool') return <BoolRow facet={facet} />;
  if (facet.kind === 'toggle') return <ToggleRow facet={facet} />;
  if (facet.kind === 'enum') return <EnumRow facet={facet} />;
  return null;
}

// Toggle dispatcher — narrows the shared ToggleFacet into the binary vs
// tri-state variants so each row component only sees the facet shape it
// can render. Replaces the old in-row `if (toggleKey === 'publicApiOnly')`
// branch + getter/setter ternaries.
function ToggleRow({ facet }: { facet: ToggleFacet }) {
  if (isBinaryToggle(facet)) return <BinaryToggleRow facet={facet} />;
  // `ToggleFacet` is a single interface (not a discriminated object union), so
  // TS can't auto-narrow the negative branch — assert it after the guard.
  return <TriToggleRow facet={facet as TriToggleFacet} />;
}

function LockedRow({ facet }: { facet: Facet }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl mb-2 bg-[color:var(--bg-surface-muted)] text-[color:var(--fg-subtle)]">
      <Lock className="w-3 h-3" />
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] truncate">{facet.label}</span>
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

function BoolRow({ facet }: { facet: BoolFacet }) {
  const { t } = useTranslation('filter');
  // Narrow selectors — each toggle subscribes only to its own bool slice.
  const v = useFilterStore((s) => s.state[facet.boolKey]);
  const setBool = useFilterStore((s) => s.setBool);
  return (
    <button type="button"
      onClick={() => { setBool(facet.boolKey, !v); }}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border transition-colors ${
        v ? SELECTED_CLASS : IDLE_CLASS
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] truncate">{facet.label}</span>
      <span className={`text-[9px] font-mono ${v ? '' : 'opacity-50'}`}>{v ? t('toggle.on') : t('toggle.off')}</span>
    </button>
  );
}

// Binary toggle (publicApiOnly): on/off, brand-tinted when on.
function BinaryToggleRow({ facet }: { facet: BinaryToggleFacet }) {
  const { t } = useTranslation('filter');
  const { value: v, setValue } = useBinaryToggle(facet);
  return (
    <button type="button"
      onClick={() => { setValue(!v); }}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border ${
        v
          ? SELECTED_CLASS
          : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)]'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)]">{facet.label}</span>
      <span className="text-[9px] font-mono">{v ? t('toggle.on') : t('toggle.off')}</span>
    </button>
  );
}

// Tri-state toggle (isTest/isGenerated/isDeprecated): null → any → only →
// exclude, cycling through true/false/null.
function TriToggleRow({ facet }: { facet: TriToggleFacet }) {
  const { t } = useTranslation('filter');
  const { value, setValue } = useTriToggle(facet);

  const cycle = () => {
    if (value === null) setValue(true);
    else if (value) setValue(false);
    else setValue(null);
  };
  const labelFor = value === null ? t('toggle.any') : value ? t('toggle.only') : t('toggle.exclude');
  const styleOn = value !== null;
  return (
    <button type="button"
      onClick={cycle}
      className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-2 border transition-colors ${
        styleOn
          ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] border-[color:var(--fg-strong)]'
          : 'bg-[color:var(--bg-surface-muted)] border-[color:var(--border-muted)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-active)]'
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] truncate">{facet.label}</span>
      <span className={`text-[9px] font-mono uppercase ${styleOn ? '' : 'opacity-50'}`}>{labelFor}</span>
    </button>
  );
}

function EnumRow({ facet }: { facet: EnumFacet }) {
  // options / selection / toggle resolve through the enum registry keyed by
  // facet.enumKey — no per-enum getter/setter ternary chains here.
  const { options, selected, toggle } = useEnumFacet(facet);
  return (
    <div className="mb-2">
      <div className="text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] mb-1.5 text-[color:var(--fg-subtle)]">
        {facet.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.has(o);
          return (
            <button type="button"
              key={o}
              onClick={() => { toggle(o); }}
              className={`text-[10px] font-bold uppercase tracking-[var(--track-eyebrow)] px-2 py-1 rounded-md border transition-colors ${
                active
                  ? 'bg-[color:var(--fg-strong)] text-[color:var(--bg-surface)] border-[color:var(--fg-strong)]'
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
