import { useState, type ReactNode } from 'react';
import {
  Layers, Flame, ShieldAlert, Radar, Compass,
  ChevronDown, ChevronRight, X, ShieldCheck, TestTube, User, Wrench,
  Power,
  type LucideIcon,
} from 'lucide-react';
import { useOverlay } from '../model/OverlayContext';
import { useBoundaries } from '@features/inspect-boundaries';
import { useTheme } from '@shared/theme';
import { useTranslation } from '@shared/i18n';
import { GlassCard, Popover } from '@shared/ui';
import { HEAT_METRICS, findMetric } from '@entities/metric';
import type { EgressProtocol, IngressProtocol, RiskLensKey, TimeWindow } from '@entities/repo';

// Master-detail panel. Left rail lists the four overlay categories with
// icon + label + current value; right pane shows the options for whichever
// row is selected. The layout never reflows when the user switches rows,
// which keeps the eye anchored and avoids the accordion "jump" the prior
// 2x2 grid suffered from.

// Time window used to be its own row but is only meaningful when the heat
// metric is `time-hotspot` — making it a top-level row produced a "why
// doesn't anything change?" UX gap. It now lives inside the Heat detail
// pane as a child control of the metric, surfaced only when relevant.
type RowId = 'heat' | 'risk' | 'api' | 'boundaries';

const INGRESS_PROTOCOLS: IngressProtocol[] = ['http', 'webhook', 'queue', 'grpc'];
const EGRESS_PROTOCOLS: EgressProtocol[] = ['http', 'db', 'fs', 'queue'];

const RISK_LENSES: { key: RiskLensKey; Icon: LucideIcon; label: string; hint: string }[] = [
  { key: 'security', Icon: ShieldAlert, label: 'Security',  hint: 'SAST × secrets × vulnerable status' },
  { key: 'testGaps', Icon: TestTube,    label: 'Test gaps', hint: 'Big files × low coverage × no test' },
  { key: 'busFactor', Icon: User,       label: 'Bus factor', hint: 'Single-author × high incoming refs' },
  { key: 'techDebt',  Icon: Wrench,     label: 'Tech debt',  hint: 'Complexity × low edit-safety × churn' },
];

const TIME_WINDOWS: readonly TimeWindow[] = ['7d', '30d', '90d'] as const;

export default function OverlayPopover() {
  const { isDark } = useTheme();
  const { t } = useTranslation('overlay');
  const ov = useOverlay();
  const b = useBoundaries();
  const [selected, setSelected] = useState<RowId>('heat');

  // Per-row on-states drive the badge count and per-row indicator dot.
  const heatOn = ov.metric !== 'none';
  const riskOn = ov.riskLens !== null;
  const apiOn = ov.apiRing;
  const boundariesOn = b.anyActive;
  const activeCount = [heatOn, riskOn, apiOn, boundariesOn].filter(Boolean).length;

  const resetAll = () => {
    ov.setMetric('none');
    ov.setRiskLens(null);
    ov.setApiRing(false);
    b.clearAll();
  };

  // Heat row label gets the time window appended when the user picks the
  // time-hotspot metric, so the rail still surfaces "what's currently set"
  // without a dedicated row.
  const heatBaseLabel = findMetric(ov.metric).label;
  const heatLabel = ov.metric === 'time-hotspot'
    ? `${heatBaseLabel} · ${ov.timeWindow.toUpperCase()}`
    : heatBaseLabel;
  const riskLabel = RISK_LENSES.find((l) => l.key === ov.riskLens)?.label ?? null;
  const boundariesValue = boundariesOn
    ? [
        b.showEntry && t('boundaries.summary.entry'),
        b.showIngress && t('boundaries.summary.ingress'),
        b.showEgress && t('boundaries.summary.egress'),
      ].filter(Boolean).join(' · ')
    : t('panel.off');

  const rows: {
    id: RowId; icon: LucideIcon; iconColor: string; label: string;
    value: string; on: boolean; muted?: boolean;
  }[] = [
    { id: 'heat', icon: Flame,       iconColor: '#d98a85', label: t('panel.tile.heat'),
      value: heatOn ? heatLabel : t('panel.off'), on: heatOn },
    { id: 'risk', icon: ShieldAlert, iconColor: '#a8893a', label: t('panel.tile.risk'),
      value: riskOn ? (riskLabel ?? '') : t('panel.off'), on: riskOn },
    { id: 'api',  icon: Radar,       iconColor: '#7aa7d4', label: t('panel.tile.api'),
      value: apiOn ? t('panel.on') : t('panel.off'), on: apiOn },
    { id: 'boundaries', icon: Compass, iconColor: '#8b949e', label: t('panel.tile.boundaries'),
      value: boundariesValue, on: boundariesOn },
  ];

  return (
    <Popover
      align="start"
      width={580}
      trigger={({ open, toggle: toggleTrigger }) => (
        <GlassCard className="p-1">
          <button
            type="button"
            onClick={toggleTrigger}
            aria-expanded={open}
            className={`flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
              activeCount > 0
                ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
                : (isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5')
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('panel.title')}</span>
            {activeCount > 0 && (
              <span
                className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono"
                style={{ background: '#5fa86c', color: '#0a0d12', boxShadow: '0 0 6px rgba(95,168,108,0.5)' }}
              >
                {activeCount}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </GlassCard>
      )}
    >
      <GlassCard className="p-0 overflow-hidden">
        {/* Header — full width above the split so it reads as the panel
            title, not a column header. */}
        <div className={`flex items-center justify-between px-3 py-2 border-b ${
          isDark ? 'border-white/10 text-white/40' : 'border-black/10 text-black/40'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-[0.18em]">
            {t('panel.heading')}
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
                isDark ? 'hover:text-white/70' : 'hover:text-black/70'
              }`}
            >
              <X className="w-3 h-3" />
              {t('panel.resetAll')}
            </button>
          )}
        </div>

        <div className="flex">
          {/* Left rail */}
          <div
            className={`shrink-0 w-[220px] py-1.5 ${
              isDark ? 'border-r border-white/10' : 'border-r border-black/10'
            }`}
            role="tablist"
            aria-orientation="vertical"
          >
            {rows.map((row) => (
              <RailRow
                key={row.id}
                icon={row.icon}
                iconColor={row.iconColor}
                label={row.label}
                value={row.value}
                on={row.on}
                muted={row.muted}
                selected={selected === row.id}
                onSelect={() => { setSelected(row.id); }}
                isDark={isDark}
              />
            ))}
          </div>

          {/* Right detail. Min-height keeps the popover stable across
              category switches; the heat panel is the tallest, so we
              size to its natural footprint. */}
          <div className="flex-1 min-h-[280px] p-3">
            {selected === 'heat' && <HeatDetail isDark={isDark} t={t} />}
            {selected === 'risk' && <RiskDetail isDark={isDark} />}
            {selected === 'api'  && <ApiDetail  isDark={isDark} t={t} />}
            {selected === 'boundaries' && <BoundariesDetail isDark={isDark} t={t} />}
          </div>
        </div>
      </GlassCard>
    </Popover>
  );
}

function RailRow({
  icon: Icon, iconColor, label, value, on, muted, selected, onSelect, isDark,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  on: boolean;
  muted?: boolean;
  selected: boolean;
  onSelect: () => void;
  isDark: boolean;
}) {
  // Selection takes precedence over on-state for the surface — that way the
  // user always sees which row drives the right-pane content. The colored
  // left bar still indicates whether the overlay itself is on.
  const surface = selected
    ? (isDark ? 'bg-white/[0.08]' : 'bg-black/[0.06]')
    : (isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-black/[0.03]');
  const labelColor = selected || on
    ? (isDark ? 'text-white' : 'text-black')
    : (isDark ? 'text-white/70' : 'text-black/70');
  const valueColor = on
    ? (isDark ? 'text-white/70' : 'text-black/70')
    : (isDark ? 'text-white/40' : 'text-black/40');

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`relative w-full text-left px-3 py-2.5 transition-colors ${surface} ${
        muted ? 'opacity-80' : ''
      }`}
    >
      {on && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full"
          style={{ background: iconColor, boxShadow: `0 0 6px ${iconColor}` }}
        />
      )}
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: on ? iconColor : undefined }} />
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-black uppercase tracking-[0.18em] leading-tight ${labelColor}`}>
            {label}
          </div>
          <div className={`mt-0.5 text-[10px] truncate ${valueColor}`}>{value}</div>
        </div>
        <ChevronRight className={`w-3 h-3 shrink-0 ${
          selected
            ? (isDark ? 'text-white/70' : 'text-black/70')
            : (isDark ? 'text-white/30' : 'text-black/30')
        }`} />
      </div>
    </button>
  );
}

// --- Detail panes ---------------------------------------------------------

function HeatDetail({
  isDark, t,
}: {
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const ov = useOverlay();
  const isOn = ov.metric !== 'none';
  // The time-hotspot metric is the only one that depends on `timeWindow`,
  // so the picker lives here as a *child* of the metric — visible only
  // when meaningful, never confusingly inert.
  const timeActive = ov.metric === 'time-hotspot';
  return (
    <div>
      <DetailHeader isDark={isDark} title={t('metric')} />
      <div className="space-y-0.5 max-h-[260px] overflow-auto pr-1">
        {HEAT_METRICS.map((m) => (
          <MetricRow
            key={m.key}
            active={ov.metric === m.key}
            label={m.label}
            hint={m.hint}
            hue={m.hue}
            isDark={isDark}
            onClick={() => { ov.setMetric(m.key); }}
          />
        ))}
      </div>

      {timeActive && (
        <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <div className={`flex items-center justify-between mb-1.5 px-1 text-[9px] font-black uppercase tracking-[0.18em] ${
            isDark ? 'text-white/40' : 'text-black/40'
          }`}>
            <span>{t('panel.tile.time')}</span>
          </div>
          <div className="flex items-center gap-1">
            {TIME_WINDOWS.map((w) => {
              const active = ov.timeWindow === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => { ov.setTimeWindow(w); }}
                  aria-pressed={active}
                  className={`relative flex-1 px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                    active
                      ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
                      : (isDark ? 'text-white/70 hover:bg-white/5' : 'text-black/70 hover:bg-black/5')
                  }`}
                >
                  {w}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-2 right-2 -bottom-[1px] h-[2px] rounded-full"
                      style={{ background: '#5fa86c', boxShadow: '0 0 6px #5fa86c' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isOn && (
        <div className={`mt-2 pt-2 border-t space-y-2 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
          <Slider label={t('controls.intensity')} value={ov.intensity} onChange={ov.setIntensity} isDark={isDark} />
          <Slider label={t('controls.radius')}    value={ov.radius}    onChange={ov.setRadius}    isDark={isDark} />
          <Slider label={t('controls.threshold')} value={ov.threshold} onChange={ov.setThreshold} isDark={isDark} />
        </div>
      )}
    </div>
  );
}

function RiskDetail({ isDark }: { isDark: boolean }) {
  const ov = useOverlay();
  const active = ov.riskLens;
  const { t } = useTranslation('overlay');

  return (
    <div>
      <DetailHeader isDark={isDark} title={t('panel.tile.risk')} />
      <div className="grid grid-cols-2 gap-1.5">
        {RISK_LENSES.map(({ key, Icon, label, hint }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => { ov.setRiskLens(on ? null : key); }}
              aria-pressed={on}
              className={`relative text-left px-2.5 py-2 rounded-md transition-colors ${
                on
                  ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
                  : (isDark ? 'hover:bg-white/5 text-white/85' : 'hover:bg-black/5 text-black/85')
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
              </div>
              <div className={`mt-1 text-[9px] leading-snug ${
                isDark ? 'text-white/40' : 'text-black/40'
              } line-clamp-2`}>
                {hint}
              </div>
              {on && (
                <span
                  aria-hidden
                  className="absolute left-2 right-2 bottom-[2px] h-[2px] rounded-full"
                  style={{ background: '#5fa86c', boxShadow: '0 0 6px #5fa86c' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApiDetail({
  isDark, t,
}: {
  isDark: boolean;
  t: (k: string) => string;
}) {
  const ov = useOverlay();
  const on = ov.apiRing;
  return (
    <div>
      <DetailHeader isDark={isDark} title={t('panel.tile.api')} />
      <div className={`text-[11px] leading-relaxed mb-3 ${isDark ? 'text-white/55' : 'text-black/55'}`}>
        {t('panel.detail.apiBody')}
      </div>
      <button
        type="button"
        onClick={() => { ov.setApiRing(!on); }}
        aria-pressed={on}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
          on
            ? 'bg-[#5fa86c] text-black hover:bg-[#46c557]'
            : (isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-black/10 text-black hover:bg-black/15')
        }`}
      >
        <Power className="w-3.5 h-3.5" />
        {on ? t('panel.disable') : t('panel.enable')}
      </button>
    </div>
  );
}

function BoundariesDetail({
  isDark, t,
}: {
  isDark: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const b = useBoundaries();
  return (
    <div>
      <DetailHeader isDark={isDark} title={t('panel.tile.boundaries')} />
      <div className="space-y-1">
        <BoundaryRow
          isDark={isDark} active={b.showEntry}
          label={t('boundaries.entry')} caption={t('boundaries.entryCaption')}
          onToggle={() => { b.setShowEntry(!b.showEntry); }}
        />
        <BoundaryRow
          isDark={isDark} active={b.showIngress}
          label={t('boundaries.ingress')} caption={t('boundaries.ingressCaption')}
          onToggle={() => { b.setShowIngress(!b.showIngress); }}
        />
        {b.showIngress && (
          <ProtocolPills isDark={isDark}>
            {INGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p} isDark={isDark}
                active={b.ingressProtocols.has(p)}
                label={t(`boundaries.protocol.${p}`)}
                onClick={() => { b.toggleIngressProtocol(p); }} />
            ))}
          </ProtocolPills>
        )}
        <BoundaryRow
          isDark={isDark} active={b.showEgress}
          label={t('boundaries.egress')} caption={t('boundaries.egressCaption')}
          onToggle={() => { b.setShowEgress(!b.showEgress); }}
        />
        {b.showEgress && (
          <ProtocolPills isDark={isDark}>
            {EGRESS_PROTOCOLS.map((p) => (
              <ProtocolPill key={p} isDark={isDark}
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
  isDark, active, label, caption, onToggle,
}: { isDark: boolean; active: boolean; label: string; caption: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active}
      className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? (isDark ? 'bg-white/10' : 'bg-black/10')
          : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')
      }`}
    >
      <span
        className={`mt-0.5 w-3 h-3 rounded-[4px] shrink-0 border transition-colors ${
          active ? 'border-transparent' : (isDark ? 'border-white/30' : 'border-black/30')
        }`}
        style={{ background: active ? '#d98a85' : 'transparent' }}
      />
      <div className="min-w-0 flex-1">
        <div className={`text-[11px] font-bold leading-tight ${isDark ? 'text-white/85' : 'text-black/85'}`}>{label}</div>
        {!active && (
          <div className={`text-[9px] leading-tight mt-0.5 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{caption}</div>
        )}
      </div>
    </button>
  );
}

function ProtocolPills({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return (
    <div className={`mx-2 mb-1 -mt-0.5 pl-5 flex flex-wrap gap-1 pb-1 border-l ${
      isDark ? 'border-white/10' : 'border-black/10'
    }`}>{children}</div>
  );
}

function ProtocolPill({
  isDark, active, label, onClick,
}: { isDark: boolean; active: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.18em] transition-colors border ${
        active
          ? (isDark ? 'bg-white/15 text-white border-white/20' : 'bg-black/10 text-black border-black/15')
          : (isDark ? 'border-white/15 text-white/55 hover:text-white/70' : 'border-black/15 text-black/40 hover:text-black/70')
      }`}
    >{label}</button>
  );
}

// --- Shared bits ----------------------------------------------------------

function DetailHeader({ isDark, title }: { isDark: boolean; title: string }) {
  return (
    <div className={`text-[9px] font-black uppercase tracking-[0.18em] mb-2 ${
      isDark ? 'text-white/40' : 'text-black/40'
    }`}>
      {title}
    </div>
  );
}

function MetricRow({
  active, onClick, label, hint, hue, isDark,
}: {
  active: boolean; onClick: () => void;
  label: string; hint: string; hue: string; isDark: boolean;
}) {
  return (
    <button type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
        active
          ? (isDark ? 'bg-white/15 text-white' : 'bg-black/10 text-black')
          : (isDark ? 'hover:bg-white/5 text-white/70' : 'hover:bg-black/5 text-black/70')
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: hue, boxShadow: active ? `0 0 8px ${hue}` : 'none' }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold leading-tight">{label}</div>
        <div className={`text-[9px] leading-tight truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>
          {hint}
        </div>
      </div>
      {active && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#5fa86c' }} />}
    </button>
  );
}

function Slider({
  label, value, onChange, isDark,
}: {
  label: string; value: number; onChange: (v: number) => void; isDark: boolean;
}) {
  return (
    <div className="px-1.5">
      <div className={`flex justify-between text-[9px] font-bold uppercase tracking-[0.18em] mb-1 ${
        isDark ? 'text-white/55' : 'text-black/55'
      }`}>
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={0} max={1} step={0.01}
        value={value}
        onChange={(e) => { onChange(+e.target.value); }}
        className="w-full accent-[#d98a85]"
      />
    </div>
  );
}
