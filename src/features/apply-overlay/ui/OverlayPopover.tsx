import {
  useMemo, useRef, useState, type KeyboardEvent, type ReactNode,
} from 'react';
import {
  Layers, Flame, ShieldAlert, Radar, Compass,
  ChevronDown, ChevronRight, X, ShieldCheck, TestTube, User, Wrench,
  Power, Zap, GitBranch, Map as MapIcon,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useOverlay } from '../model/OverlayContext';
import { useBoundaries } from '@features/inspect-boundaries';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Popover } from '@shared/ui';
import { HEAT_METRICS, findMetric, type HeatMetricKey } from '@entities/metric';
import type { EgressProtocol, IngressProtocol, RiskLensKey, TimeWindow } from '@entities/repo';

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
type RowId = 'heat' | 'risk' | 'api' | 'boundaries';

const ROW_ORDER: RowId[] = ['heat', 'risk', 'api', 'boundaries'];

const INGRESS_PROTOCOLS: IngressProtocol[] = ['http', 'webhook', 'queue', 'grpc'];
const EGRESS_PROTOCOLS: EgressProtocol[] = ['http', 'db', 'fs', 'queue'];

// Per-lens hue parallels the warm/cool semantic the heat metrics use, so
// the four risk cards aren't a wall of identical pills. Hues mapped to the
// theme-aware intent palette (danger, link, info, warn).
const RISK_LENSES: { key: RiskLensKey; Icon: LucideIcon; hue: string }[] = [
  { key: 'security',  Icon: ShieldAlert, hue: 'var(--intent-danger-fg)' },
  { key: 'testGaps',  Icon: TestTube,    hue: 'var(--fg-link)' },
  { key: 'busFactor', Icon: User,        hue: 'var(--intent-info-fg)' },
  { key: 'techDebt',  Icon: Wrench,      hue: 'var(--intent-warn-fg)' },
];

const TIME_WINDOWS: readonly TimeWindow[] = ['7d', '30d', '90d'] as const;

// Threshold is meaningful only for continuous-score metrics. Cycles is
// binary (in/out of an SCC) and Confidence is categorical, so a threshold
// slider would be inert for those — hide it instead of showing a knob the
// renderer ignores.
const METRICS_WITHOUT_THRESHOLD = new Set<HeatMetricKey>(['cycles', 'unknown']);

// Brand "on / active" affordance. Theme-aware via --fg-accent so the panel
// no longer hardcodes a green that breaks in light mode.
const ACCENT = 'var(--fg-accent)';
const ACCENT_TINT_BG = 'color-mix(in srgb, var(--fg-accent) 16%, transparent)';
const ACCENT_TINT_RING = 'color-mix(in srgb, var(--fg-accent) 42%, transparent)';
const ACCENT_TEXT = 'var(--fg-accent)';

// Discrete category hues for the footer / preview chips, theme-aware.
const HUE_DANGER = 'var(--intent-danger-fg)';
const HUE_LINK = 'var(--fg-link)';
const HUE_WARN = 'var(--intent-warn-fg)';
const HUE_INFO = 'var(--intent-info-fg)';
const HUE_NEUTRAL = 'var(--fg-muted)';

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

  const rows: {
    id: RowId; icon: LucideIcon; iconColor: string; label: string;
    value: string; on: boolean;
  }[] = [
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
            {selected === 'heat' && <HeatDetail t={t} />}
            {selected === 'risk' && <RiskDetail t={t} />}
            {selected === 'api'  && <ApiDetail  t={t} />}
            {selected === 'boundaries' && <BoundariesDetail t={t} />}
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

// --- Rail with arrow-key navigation --------------------------------------

function Rail({
  rows, selected, onSelect,
}: {
  rows: { id: RowId; icon: LucideIcon; iconColor: string; label: string; value: string; on: boolean }[];
  selected: RowId;
  onSelect: (id: RowId) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = ROW_ORDER.indexOf(selected);
    let next = i;
    if (e.key === 'ArrowDown') next = (i + 1) % ROW_ORDER.length;
    else if (e.key === 'ArrowUp') next = (i - 1 + ROW_ORDER.length) % ROW_ORDER.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ROW_ORDER.length - 1;
    onSelect(ROW_ORDER[next]);
    // Move focus to the newly-selected tab so screen readers track.
    const btn = railRef.current?.querySelector<HTMLButtonElement>(
      `button[data-row-id="${ROW_ORDER[next]}"]`,
    );
    btn?.focus();
  };

  return (
    <div
      ref={railRef}
      onKeyDown={onKey}
      className="shrink-0 w-[220px] py-1.5 border-r border-[var(--border-default)]"
      role="tablist"
      aria-orientation="vertical"
    >
      {rows.map((row) => (
        <RailRow
          key={row.id}
          rowId={row.id}
          icon={row.icon}
          iconColor={row.iconColor}
          label={row.label}
          value={row.value}
          on={row.on}
          selected={selected === row.id}
          onSelect={() => { onSelect(row.id); }}
        />
      ))}
    </div>
  );
}

function RailRow({
  rowId, icon: Icon, iconColor, label, value, on, selected, onSelect,
}: {
  rowId: RowId;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  on: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  // Selection takes precedence over on-state for the surface — that way the
  // user always sees which row drives the right-pane content. The on-state
  // carries through the icon tint and the "ON" pill (no left-edge stripe
  // per project convention).
  const surface = selected
    ? 'bg-[var(--bg-active)]'
    : 'hover:bg-[var(--bg-hover)]';
  const labelColor = selected || on
    ? 'text-[var(--fg-strong)]'
    : 'text-[var(--fg-default)]';
  const valueColor = on
    ? 'text-[var(--fg-default)]'
    : 'text-[var(--fg-subtle)]';

  return (
    <button
      type="button"
      role="tab"
      data-row-id={rowId}
      tabIndex={selected ? 0 : -1}
      aria-selected={selected}
      onClick={onSelect}
      className={`relative w-full text-left px-3 py-2.5 transition-colors outline-none ${surface}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: on ? iconColor : undefined }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] leading-tight ${labelColor}`}>
              {label}
            </span>
            {on && <OnPill />}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${valueColor}`}>{value}</div>
        </div>
        <ChevronRight className={`w-3 h-3 shrink-0 ${
          selected ? 'text-[var(--fg-default)]' : 'text-[var(--fg-subtle)]'
        }`} />
      </div>
    </button>
  );
}

function OnPill() {
  return (
    <span
      className="text-[var(--fs-2xs)] font-black uppercase tracking-[var(--track-eyebrow)] px-1 py-px rounded leading-none"
      style={{
        background: ACCENT_TINT_BG,
        color: ACCENT_TEXT,
        boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
      }}
    >
      on
    </span>
  );
}

// --- Detail panes ---------------------------------------------------------

function HeatDetail({
  t,
}: {
  t: TFunction;
}) {
  const ov = useOverlay();
  const isOn = ov.metric !== 'none';
  const timeActive = ov.metric === 'time-hotspot';
  const showThreshold = isOn && !METRICS_WITHOUT_THRESHOLD.has(ov.metric);
  // 'Off' is a toggle, not a metric — pull it out so it doesn't read like
  // "another red dot". Clearing happens via the header clear button.
  const realMetrics = useMemo(() => HEAT_METRICS.filter((m) => m.key !== 'none'), []);

  return (
    <div>
      <DetailHeader title={t('metric')} onClear={isOn ? () => { ov.setMetric('none'); } : undefined} />
      <div className="space-y-0.5">
        {realMetrics.map((m) => (
          <MetricRow
            key={m.key}
            active={ov.metric === m.key}
            label={m.label}
            hint={m.hint}
            hue={m.hue}
            onClick={() => { ov.setMetric(m.key); }}
          />
        ))}
      </div>

      {timeActive && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)]">
          <div className="mb-1.5 px-1 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            {t('panel.tile.time')}
          </div>
          <SegmentedControl
            options={TIME_WINDOWS.map((w) => ({ key: w, label: w.toUpperCase() }))}
            value={ov.timeWindow}
            onChange={(v) => { ov.setTimeWindow(v); }}
          />
        </div>
      )}

      {isOn && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-2">
          <div className="px-1.5 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
            {t('panel.tile.controls')}
          </div>
          <Slider label={t('controls.intensity')} value={ov.intensity} onChange={ov.setIntensity} />
          <Slider label={t('controls.radius')}    value={ov.radius}    onChange={ov.setRadius} />
          {showThreshold && (
            <Slider label={t('controls.threshold')} value={ov.threshold} onChange={ov.setThreshold} />
          )}
        </div>
      )}
    </div>
  );
}

function RiskDetail({
  t,
}: {
  t: TFunction;
}) {
  const ov = useOverlay();
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
                <span className={`text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] ${
                  on ? '' : 'text-[var(--fg-default)]'
                }`} style={on ? { color: hue } : undefined}>
                  {t(`risk.lens.${key}.label`)}
                </span>
              </div>
              <div
                className="mt-1 text-[9px] leading-snug text-[var(--fg-muted)]"
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
      <div className="mt-2 px-1 text-[9px] leading-snug text-[var(--fg-subtle)]">
        {t('risk.toggleHint')}
      </div>
    </div>
  );
}

function ApiDetail({
  t,
}: {
  t: TFunction;
}) {
  const ov = useOverlay();
  const on = ov.apiRing;
  return (
    <div>
      <DetailHeader
        title={t('panel.tile.api')}
        onClear={on ? () => { ov.setApiRing(false); } : undefined}
      />
      <div className="text-[11px] leading-relaxed mb-3 text-[var(--fg-muted)]">
        {t('panel.detail.apiBody')}
      </div>

      {/* Mini preview — a dot inside a thin outer ring matches what the
          overlay actually renders on the stage, so the user knows what
          they're enabling without flipping the toggle. */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative inline-block w-5 h-5">
          <span className="absolute inset-0 rounded-full" style={{
            border: '1px solid var(--fg-link)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--fg-link) 50%, transparent)',
          }} />
          <span className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--fg-link)]" />
        </span>
        <span className="text-[var(--fs-xs)] text-[var(--fg-muted)]">
          {t('panel.detail.apiPreview')}
        </span>
      </div>

      <ToggleButton
        on={on}
        onClick={() => { ov.setApiRing(!on); }}
        label={on ? t('panel.disable') : t('panel.enable')}
      />
    </div>
  );
}

function BoundariesDetail({
  t,
}: {
  t: TFunction;
}) {
  const b = useBoundaries();
  const anyOn = b.anyActive;
  return (
    <div>
      <DetailHeader
        title={t('panel.tile.boundaries')}
        onClear={anyOn ? () => { b.clearAll(); } : undefined}
      />
      <div className="space-y-1">
        <BoundaryRow
          active={b.showEntry}
          label={t('boundaries.entry')} caption={t('boundaries.entryCaption')}
          onToggle={() => { b.setShowEntry(!b.showEntry); }}
        />
        <BoundaryRow
          active={b.showIngress}
          label={t('boundaries.ingress')} caption={t('boundaries.ingressCaption')}
          onToggle={() => { b.setShowIngress(!b.showIngress); }}
        />
        {b.showIngress && (
          <ProtocolPills>
            {INGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p}
                active={b.ingressProtocols.has(p)}
                label={t(`boundaries.protocol.${p}`)}
                onClick={() => { b.toggleIngressProtocol(p); }} />
            ))}
          </ProtocolPills>
        )}
        <BoundaryRow
          active={b.showEgress}
          label={t('boundaries.egress')} caption={t('boundaries.egressCaption')}
          onToggle={() => { b.setShowEgress(!b.showEgress); }}
        />
        {b.showEgress && (
          <ProtocolPills>
            {EGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p}
                active={b.egressProtocols.has(p)}
                label={t(`boundaries.protocol.${p}`)}
                onClick={() => { b.toggleEgressProtocol(p); }} />
            ))}
          </ProtocolPills>
        )}
      </div>
    </div>
  );
}

function BoundaryRow({
  active, label, caption, onToggle,
}: { active: boolean; label: string; caption: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active}
      className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? 'bg-[var(--bg-active)]'
          : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      <span
        className={`mt-0.5 w-3 h-3 rounded-[4px] shrink-0 border transition-colors ${
          active ? 'border-transparent' : 'border-[var(--border-strong)]'
        }`}
        style={{ background: active ? 'var(--intent-danger-fg)' : 'transparent' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold leading-tight text-[var(--fg-default)]">{label}</div>
        {!active && (
          <div className="text-[9px] leading-tight mt-0.5 text-[var(--fg-subtle)]">{caption}</div>
        )}
      </div>
    </button>
  );
}

function ProtocolPills({ children }: { children: ReactNode }) {
  // No left-edge stripe (project convention) — indent via padding only.
  return (
    <div className="mx-2 mb-1 -mt-0.5 pl-5 flex flex-wrap gap-1 pb-1">{children}</div>
  );
}

function ProtocolPill({
  active, label, onClick,
}: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] transition-colors border"
      style={active
        ? { background: ACCENT_TINT_BG, color: ACCENT_TEXT, borderColor: ACCENT_TINT_RING }
        : undefined
      }
    >
      <span className={!active ? 'text-[var(--fg-muted)]' : ''}>{label}</span>
    </button>
  );
}

// --- Shared bits ----------------------------------------------------------

function DetailHeader({
  title, onClear,
}: { title: string; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] text-[var(--fg-subtle)]">
        {title}
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] px-1.5 py-0.5 rounded transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-hover)]"
        >
          <X className="w-2.5 h-2.5" /> clear
        </button>
      )}
    </div>
  );
}

function MetricRow({
  active, onClick, label, hint, hue,
}: {
  active: boolean; onClick: () => void;
  label: string; hint: string; hue: string;
}) {
  return (
    <button type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
        active
          ? 'bg-[var(--bg-active)] text-[var(--fg-strong)]'
          : 'hover:bg-[var(--bg-hover)] text-[var(--fg-default)]'
      }`}
    >
      <span
        className="relative w-2.5 h-2.5 rounded-full shrink-0 transition-all"
        style={{
          background: active ? hue : 'transparent',
          boxShadow: active
            ? `0 0 0 1px ${hue}, 0 0 10px ${hue}`
            : 'inset 0 0 0 1px var(--border-strong)',
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[var(--fs-base)] font-bold leading-tight">{label}</div>
        <div
          className={`text-[var(--fs-xs)] leading-snug mt-0.5 ${
            active ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)]'
          }`}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {hint}
        </div>
      </div>
      {active && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />}
    </button>
  );
}

function Slider({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="px-1.5">
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)] mb-1 text-[var(--fg-muted)]">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={(e) => { onChange(+e.target.value); }}
        className="w-full"
        style={{ accentColor: 'var(--intent-danger-fg)' }}
      />
    </div>
  );
}

// Pill-group control with arrow-key navigation. Used for the time-window
// picker; centralised so segmented controls feel uniform across the panel.
function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.key === value);
    const next = e.key === 'ArrowRight'
      ? (i + 1) % options.length
      : (i - 1 + options.length) % options.length;
    onChange(options[next].key);
    wrapRef.current?.querySelector<HTMLButtonElement>(
      `button[data-segment-key="${options[next].key}"]`,
    )?.focus();
  };
  return (
    <div
      ref={wrapRef}
      onKeyDown={onKey}
      className="flex items-center gap-1"
      role="radiogroup"
    >
      {options.map(({ key, label }) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            data-segment-key={key}
            onClick={() => { onChange(key); }}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className="flex-1 px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--border-focus)]"
            style={active
              ? {
                  background: ACCENT_TINT_BG,
                  color: ACCENT_TEXT,
                  boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
                }
              : undefined
            }
          >
            <span className={!active ? 'text-[var(--fg-muted)]' : ''}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ToggleButton({
  on, onClick, label,
}: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-[var(--track-eyebrow)] transition-colors"
      style={on
        ? {
            background: ACCENT_TINT_BG,
            color: ACCENT_TEXT,
            boxShadow: `inset 0 0 0 1px ${ACCENT_TINT_RING}`,
          }
        : undefined
      }
    >
      <Power className={`w-3.5 h-3.5 ${on ? '' : 'text-[var(--fg-muted)]'}`} />
      <span className={!on ? 'text-[var(--fg-default)]' : ''}>{label}</span>
    </button>
  );
}

// Footer chip — colour-tinted glass pill with an inline clear button so the
// user can drop a single overlay without going back to its detail pane.
function FooterChip({
  color, label, onClear,
}: { color: string; label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-[var(--track-eyebrow)]"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="truncate max-w-[180px]">{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        aria-label="clear"
        className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded transition-opacity opacity-60 hover:opacity-100"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// Imports kept around for potential future use in detail panes.
void Zap; void GitBranch; void MapIcon;
