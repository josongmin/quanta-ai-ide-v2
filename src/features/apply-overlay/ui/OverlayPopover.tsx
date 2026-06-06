import { useState } from 'react';
import {
  Layers, Flame, ShieldAlert, Radar, Compass, ChevronDown, X,
} from 'lucide-react';
import { useOverlay } from '../model/OverlayContext';
import { useBoundaries } from '@features/inspect-boundaries';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Popover } from '@shared/ui';
import { findMetric } from '@entities/metric';
import { Rail } from './parts/Rail';
import { HeatDetail } from './parts/HeatDetail';
import { RiskDetail } from './parts/RiskDetail';
import { ApiDetail } from './parts/ApiDetail';
import { BoundariesDetail } from './parts/BoundariesDetail';
import {
  ACCENT, ACCENT_TINT_BG, ACCENT_TINT_RING, ACCENT_TEXT,
  HUE_DANGER, HUE_LINK, HUE_WARN, HUE_INFO, HUE_NEUTRAL,
  FooterChip,
} from './parts/shared';
import type { RailRowData, RowId } from './parts/types';

// Master-detail panel. Left rail lists overlay categories with icon + label
// + current value; right pane shows the options for whichever row is
// selected. The layout never reflows when the user switches rows, which
// keeps the eye anchored and avoids the accordion "jump" the prior 2x2 grid
// suffered from.
//
// Time window used to be its own row but is only meaningful when the heat
// metric is `time-hotspot` — making it a top-level row produced a "why
// doesn't anything change?" UX gap. It now lives inside the Heat detail
// pane as a child control of the metric, surfaced only when relevant.
export default function OverlayPopover() {
  const { t } = useTranslation('overlay');
  const ov = useOverlay();
  const b = useBoundaries();
  const [selected, setSelected] = useState<RowId>('heat');

  // Per-row on-states drive the badge count and per-row indicator dot.
  const heatOn = ov.metric !== 'none';
  const riskOn = ov.riskLens !== null;
  const apiOn = ov.apiRing;
  const boundariesOn = b.anyActive;
  // Stage previews — set elsewhere (blast-radius shortcut, "trace path",
  // PR preview launcher). Surface them in the footer so the user can see
  // and clear them without hunting around the stage.
  const blastOn = ov.blastSeed !== null;
  const pathOn = ov.pathFrom !== null && ov.pathTo !== null;
  const prOn = ov.prSeed !== null;

  const activeCount = [heatOn, riskOn, apiOn, boundariesOn].filter(Boolean).length;
  const previewCount = [blastOn, pathOn, prOn].filter(Boolean).length;

  const resetAll = () => {
    ov.setMetric('none');
    ov.setRiskLens(null);
    ov.setApiRing(false);
    b.clearAll();
    ov.clearBlast();
    ov.clearPath();
    ov.setPrSeed(null);
  };

  // Heat row label gets the time window appended when the user picks the
  // time-hotspot metric, so the rail still surfaces "what's currently set"
  // without a dedicated row.
  const heatBaseLabel = findMetric(ov.metric).label;
  const heatLabel = ov.metric === 'time-hotspot'
    ? `${heatBaseLabel} · ${ov.timeWindow.toUpperCase()}`
    : heatBaseLabel;
  const riskLabel = ov.riskLens ? t(`risk.lens.${ov.riskLens}.label`) : null;
  const boundariesValue = boundariesOn
    ? [
        b.showEntry && t('boundaries.summary.entry'),
        b.showIngress && t('boundaries.summary.ingress'),
        b.showEgress && t('boundaries.summary.egress'),
      ].filter(Boolean).join(' · ')
    : t('panel.off');

  const rows: RailRowData[] = [
    { id: 'heat', icon: Flame,       iconColor: HUE_DANGER, label: t('panel.tile.heat'),
      value: heatOn ? heatLabel : t('panel.off'), on: heatOn },
    { id: 'risk', icon: ShieldAlert, iconColor: HUE_WARN, label: t('panel.tile.risk'),
      value: riskOn ? (riskLabel ?? '') : t('panel.off'), on: riskOn },
    { id: 'api',  icon: Radar,       iconColor: HUE_LINK, label: t('panel.tile.api'),
      value: apiOn ? t('panel.on') : t('panel.off'), on: apiOn },
    { id: 'boundaries', icon: Compass, iconColor: HUE_NEUTRAL, label: t('panel.tile.boundaries'),
      value: boundariesValue, on: boundariesOn },
  ];

  return (
    <Popover
      align="start"
      placement="anchor"
      side="bottom"
      // Cap width to viewport so the panel never clips on narrow centre
      // panes. Popover already clamps *position* but not width.
      width="min(620px, calc(100vw - 24px))"
      trigger={({ open, toggle: toggleTrigger }) => {
        const active = activeCount > 0;
        return (
          <GlassCard className="p-1">
            <button
              type="button"
              onClick={toggleTrigger}
              aria-expanded={open}
              aria-haspopup="dialog"
              className={`group flex items-center gap-1.5 pl-2 pr-1.5 h-8 rounded-md text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] transition-colors ${
                open ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-hover)]'
              } ${
                active ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-muted)]'
              }`}
            >
              <Layers
                className="w-3.5 h-3.5 transition-colors"
                style={active ? { color: ACCENT } : undefined}
              />
              <span>{t('panel.title')}</span>
              {active && (
                <span
                  className="inline-flex items-center justify-center min-w-[15px] h-[15px] px-[3px] rounded-full text-[9px] font-bold tabular-nums leading-none"
                  style={{
                    background: ACCENT_TINT_BG,
                    color: ACCENT_TEXT,
                    boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
                  }}
                >
                  {activeCount}
                </span>
              )}
              <ChevronDown
                className={`w-3 h-3 -mr-0.5 transition-all duration-200 ${open ? 'rotate-180' : ''} text-[var(--fg-subtle)] group-hover:text-[var(--fg-default)]`}
              />
            </button>
          </GlassCard>
        );
      }}
    >
      <GlassCard className="p-0 overflow-hidden">
        {/* Header — panel title only. The reset/active summary lives in the
            footer next to the chip strip so they read as one unit. */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] text-[var(--fg-subtle)]">
          <span className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)]">
            {t('panel.heading')}
          </span>
          <span className="text-[9px] font-mono normal-case tracking-normal text-[var(--fg-subtle)]">
            esc
          </span>
        </div>

        <div className="flex">
          <Rail
            rows={rows}
            selected={selected}
            onSelect={setSelected}
          />

          {/* Right detail. Min-height keeps the popover stable across
              category switches; Popover itself clamps to viewport so we
              don't need an inner scroll container. */}
          <div className="flex-1 min-h-[280px] p-3">
            {selected === 'heat' && <HeatDetail t={t} ov={ov} />}
            {selected === 'risk' && <RiskDetail t={t} ov={ov} />}
            {selected === 'api'  && <ApiDetail  t={t} ov={ov} />}
            {selected === 'boundaries' && <BoundariesDetail t={t} b={b} />}
          </div>
        </div>

        {/* Footer — what's currently painting on the dot field. Reset all
            sits at the right so the user's eye finds the active state
            and the way to clear it together. */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-[var(--border-default)] text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-muted)]">
          <span className="shrink-0">{t('panel.painting')}</span>
          {activeCount === 0 && previewCount === 0 ? (
            <span className="text-[var(--fg-subtle)]">
              {t('panel.paintingEmpty')}
            </span>
          ) : (
            <span className="flex items-center gap-1 flex-wrap min-w-0">
              {heatOn       && <FooterChip color={HUE_DANGER} label={`heat · ${heatLabel}`} onClear={() => { ov.setMetric('none'); }} />}
              {riskOn       && <FooterChip color={HUE_WARN} label={`risk · ${riskLabel ?? ''}`} onClear={() => { ov.setRiskLens(null); }} />}
              {apiOn        && <FooterChip color={HUE_LINK} label="public api" onClear={() => { ov.setApiRing(false); }} />}
              {boundariesOn && <FooterChip color={HUE_NEUTRAL} label={`boundaries · ${boundariesValue}`} onClear={() => { b.clearAll(); }} />}
              {blastOn      && <FooterChip color={HUE_DANGER} label={t('panel.preview.blast')} onClear={() => { ov.clearBlast(); }} />}
              {pathOn       && <FooterChip color={HUE_LINK} label={t('panel.preview.path')} onClear={() => { ov.clearPath(); }} />}
              {prOn         && <FooterChip color={HUE_INFO} label={t('panel.preview.pr')} onClear={() => { ov.setPrSeed(null); }} />}
            </span>
          )}
          {(activeCount > 0 || previewCount > 0) && (
            <button
              type="button"
              onClick={resetAll}
              className="ml-auto shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] px-1.5 py-0.5 rounded transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-3 h-3" />
              {t('panel.resetAll')}
            </button>
          )}
        </div>
      </GlassCard>
    </Popover>
  );
}
