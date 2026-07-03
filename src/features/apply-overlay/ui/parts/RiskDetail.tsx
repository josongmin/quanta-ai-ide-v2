import {
  ShieldAlert, TestTube, User, Wrench, type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import type { RiskLensKey } from '@entities/repo';
import type { useOverlay } from '../../model/OverlayContext';
import { DetailHeader } from './shared';

type Overlay = ReturnType<typeof useOverlay>;

// Per-lens hue parallels the warm/cool semantic the heat metrics use, so
// the four risk cards aren't a wall of identical pills. Hues mapped to the
// theme-aware intent palette (danger, link, info, warn).
const RISK_LENSES: { key: RiskLensKey; Icon: LucideIcon; hue: string }[] = [
  { key: 'security',  Icon: ShieldAlert, hue: 'var(--intent-danger-fg)' },
  { key: 'testGaps',  Icon: TestTube,    hue: 'var(--fg-link)' },
  { key: 'busFactor', Icon: User,        hue: 'var(--intent-info-fg)' },
  { key: 'techDebt',  Icon: Wrench,      hue: 'var(--intent-warn-fg)' },
];

// Four mutually-exclusive risk lenses rendered as a 2x2 toggle grid.
export function RiskDetail({
  t, ov,
}: {
  t: TFunction;
  ov: Overlay;
}) {
  const active = ov.riskLens;

  return (
    <div>
      <DetailHeader
        title={t('panel.tile.risk')}
        onClear={active ? () => { ov.setRiskLens(null); } : undefined}
      />
      <div className="grid grid-cols-2 gap-1.5">
        {RISK_LENSES.map(({ key, Icon, hue }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { ov.setRiskLens(on ? null : key); }}
              aria-pressed={on}
              className={`relative text-left px-2.5 py-2 rounded-md transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--border-focus)] ${
                on
                  ? 'bg-[var(--bg-elevated)]'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--fg-default)]'
              }`}
              style={on ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${hue} 33%, transparent)` } : undefined}
            >
              <div className="flex items-center gap-1.5">
                <Icon
                  className="w-3 h-3 shrink-0"
                  style={{ color: on ? hue : undefined }}
                />
                <span className={`text-xs font-black uppercase tracking-eyebrow ${
                  on ? '' : 'text-[var(--fg-default)]'
                }`} style={on ? { color: hue } : undefined}>
                  {t(`risk.lens.${key}.label`)}
                </span>
              </div>
              <div
                className="mt-1 text-2xs leading-snug text-[var(--fg-muted)]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {t(`risk.lens.${key}.hint`)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 px-1 text-2xs leading-snug text-[var(--fg-subtle)]">
        {t('risk.toggleHint')}
      </div>
    </div>
  );
}
