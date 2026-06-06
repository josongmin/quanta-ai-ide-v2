import { useCallback, useEffect, useRef, useState } from 'react';
import { History, X, Boxes, Folder, FileCode } from 'lucide-react';
import { useFilterRepo } from '@entities/filter-state';
import type { RepoData } from '@entities/repo';
import { useTranslation } from '@shared/i18n';
import { ResizeHandle, useDialogA11y } from '@shared/ui';
import { useClickOutside } from '@shared/lib';
// Intelligence layout constants — duplicated here to avoid features → app
// boundary violation. Source of truth is @app/router/intelligence/panelLayout.
const INTELLIGENCE_LAYOUT = {
  sideInset: 12,
  panelGap: 20,
  topInset: 12,
  bottomInset: 12,
  centerReserve: 88,
} as const;
import { useStack, stackKey, type StackItem } from '../model/StackContext';
import FocusScanPanel from './focus-scan/FocusScanPanel';
import InspectPanel from './InspectPanel';

type Props = {
  isDark: boolean;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onWidthChange: (next: number) => void;
};

// Display string for an inspect tab (label / path).
function itemLabel(
  item: StackItem,
  repo: RepoData,
  t: (key: string) => string,
): { name: string; sub: string } {
  if (item.kind === 'workspace') return { name: t('header.workspace'), sub: t('header.workspaceName') };
  if (item.kind === 'folder') {
    const f = repo.foldersByPath.get(item.path);
    return {
      name: f?.name ?? t('deps.rootLabel'),
      sub: f ? (f.parts.length === 0 ? '/' : '/' + f.parts.join('/')) : item.path,
    };
  }
  const file = repo.files[item.id];
  return { name: file?.name ?? `#${item.id}`, sub: file?.folderPath ?? '' };
}

export default function FocusScanStack({
  isDark,
  width,
  minWidth = 320,
  maxWidth = 620,
  defaultWidth = 360,
  onWidthChange,
}: Props) {
  const { items, activeKey, activate, close } = useStack();
  const repo = useFilterRepo();
  const { t } = useTranslation('inspect');

  const idx = (() => {
    const i = items.findIndex((x) => stackKey(x) === activeKey);
    return i < 0 ? items.length - 1 : i;
  })();
  const active = items[idx];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (items.length === 0) return;
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        activate(stackKey(prev));
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        const next = items[(idx + 1) % items.length];
        activate(stackKey(next));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [items, idx, activate]);

  if (!active) return null;

  // Browser-tab style left rail. Active tab = open folder face: same fill as
  // the card and no inner border, visually merged with the card body.
  // Inactive tabs = closed folders behind: full border on all sides.
  const TAB_THICKNESS = 24;   // rail width (the tab's depth into the rail)
  const TAB_MIN_LENGTH = 70;  // shortest tab even for very short names
  const TAB_MAX_LENGTH = 200; // cap so very long names truncate

  // Rough per-character width at the active font size (11px bold). The tab
  // also has fixed chrome (index gutter ~14px + padding 20px ~= 34px).
  function tabLengthFor(name: string): number {
    const CHROME = 34;
    const PER_CHAR = 6.4;
    const raw = Math.round(name.length * PER_CHAR + CHROME);
    return Math.max(TAB_MIN_LENGTH, Math.min(TAB_MAX_LENGTH, raw));
  }

  // Rail's right edge = card's left edge. Active tab will reach +1px into
  // the card to hide the seam.
  const leftGutter = items.length > 1 ? TAB_THICKNESS : 0;
  const activeKeyStr = stackKey(active);

  // No Portal: rendering inside <body> directly puts the panel in body's
  // stacking context, where backdrop-filter's only backdrop is the body's
  // solid background — the WebGL canvas (sibling of React root) is not
  // refracted. Keeping this inside Stage's tree (sibling of the canvas
  // mount) means the canvas pixels are the actual backdrop, so the dots
  // refract through the GlassCard the same way they do behind FilterBar.
  //
  // `position: absolute` (not fixed): a fixed element is its own containing
  // block, and Chromium treats backdrop-filter inside a fixed subtree as if
  // the canvas (which is *outside* this containing block, in `Stage`'s root)
  // is no longer a backdrop candidate. The result is a flat-coloured panel
  // even though the GlassCard token says alpha 0.04. The left FilterBar
  // mounts inside an `absolute` wrapper, which is why its glass refracts.
  //
  // Keep the panel body as a direct child of that absolute shell. An extra
  // positioned/animated wrapper in between was enough for Chromium to promote
  // the subtree into its own composited layer, which flattened the right rail
  // into a dark plate instead of sampling the dot-field behind it.
  return (
    <>
      <div
        className="absolute z-30 w-[360px] pointer-events-none"
        style={{
          top: INTELLIGENCE_LAYOUT.topInset,
          right: INTELLIGENCE_LAYOUT.sideInset,
          bottom: INTELLIGENCE_LAYOUT.bottomInset,
          width,
        }}
      >
      <ResizeHandle
        side="left"
        width={width}
        min={minWidth}
        max={maxWidth}
        defaultWidth={defaultWidth}
        onChange={onWidthChange}
        ariaLabel="Resize right panel"
      />
      {items.length > 1 && (
        <div
          className="absolute top-0 bottom-0 flex flex-col gap-1.5 pt-4 pb-3 pointer-events-none z-[105]"
          style={{
            width: TAB_THICKNESS,
            left: -leftGutter,
          }}
        >
          <HistoryButton
            items={items}
            activeKey={activeKeyStr}
            isDark={isDark}
            thickness={TAB_THICKNESS}
            onPick={activate}
            onClose={close}
            repo={repo}
            t={t}
          />

          {items.map((it, i) => {
            const k = stackKey(it);
            const isActive = k === activeKeyStr;
            const sideOff = i - idx;
            const absOff = Math.abs(sideOff);
            const depth = Math.min(absOff, 4);
            const opacity = isActive ? 1 : Math.max(0.55, 0.95 - (depth - 1) * 0.12);
            const fontSize = isActive ? 11 : depth === 1 ? 10.5 : depth === 2 ? 10 : 9.5;
            const { name } = itemLabel(it, repo, t);
            const length = tabLengthFor(name);

            return (
              <button
                key={k}
                type="button"
                onClick={() => { if (!isActive) activate(k); }}
                aria-label={`${isActive ? t('stack_axis.active') : t('stack_axis.activate')} ${name}`}
                aria-current={isActive ? 'true' : undefined}
                className={`group relative shrink-0 pointer-events-auto ${
                  isActive ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{
                  width: TAB_THICKNESS,
                  height: length,
                  opacity,
                  transform: isActive ? 'translateX(1px)' : 'translateX(0)',
                  transition: 'opacity 220ms ease-out, transform 220ms cubic-bezier(0.22,1,0.36,1), height 220ms cubic-bezier(0.22,1,0.36,1)',
                  zIndex: isActive ? 2 : 1,
                }}
                title={name}
              >
                <CrestTab
                  isDark={isDark}
                  name={name}
                  kind={it.kind}
                  index={i + 1}
                  fontSize={fontSize}
                  length={length}
                  thickness={TAB_THICKNESS}
                  isActive={isActive}
                />
              </button>
            );
          })}
        </div>
      )}

      <div key={activeKeyStr} className="h-full pointer-events-auto">
        {active.kind === 'file'
          ? <FocusScanPanel file={repo.files[active.id]} isDark={isDark} embedded />
          : <InspectPanel
              isDark={isDark}
              target={active.kind === 'workspace' ? { kind: 'workspace' } : { kind: 'folder', path: active.path }}
            />}
      </div>
      </div>
    </>
  );
}

function CrestTab({
  isDark, name, kind, index, fontSize, length, thickness, isActive,
}: {
  isDark: boolean; name: string; kind: StackItem['kind']; index: number; fontSize: number;
  length: number; thickness: number; isActive: boolean;
}) {
  const Icon = kind === 'workspace' ? Boxes : kind === 'folder' ? Folder : FileCode;
  // Square folder-tab, rotated -90deg so it stands vertically.
  // Active tab : shares the GlassCard surface tokens (same alpha + blur via
  //              the .glass-dark/.glass-light class) + no right border so
  //              tab and card read as one open folder face. Do NOT bake an
  //              opaque rgba fill here — that visibly desyncs the tab from
  //              the card body.
  // Inactive   : darker, sunken fill + full border → closed folder behind.
  const inactiveBg = 'var(--bg-active)';
  const activeBorder = 'var(--border-strong)';
  const inactiveBorder = 'var(--border-default)';

  // Coordinate mapping under rotate(-90deg):
  //   pre-rotation right  → post-rotation TOP    (the tab's outer/free end)
  //   pre-rotation left   → post-rotation BOTTOM
  //   pre-rotation top    → post-rotation LEFT   (rail's outer side, away from card)
  //   pre-rotation bottom → post-rotation RIGHT  (the side that meets the card)
  // → To merge active tab with card we drop pre-rotation `borderBottom`.
  // → Outer end of standing tab = pre-rotation `borderRight`; we keep it bold
  //   so the tip reads as a closed cap.
  return (
    <div
      className={`absolute flex items-center px-2.5 gap-1.5 overflow-hidden group-hover:brightness-110 ${
        isActive ? (isDark ? 'glass-dark' : 'glass-light') : ''
      }`}
      style={{
        width: length,
        height: thickness,
        top: '50%',
        left: '50%',
        marginTop: -thickness / 2,
        marginLeft: -length / 2,
        borderRadius: 0,
        // Inactive tabs use a flat sunken fill; the active tab inherits the
        // GlassCard surface via the glass-* class so it stays in lockstep
        // with the panel body.
        ...(isActive ? null : { background: inactiveBg }),
        // outer top/bottom long edges of the standing tab
        borderTop: `1px solid ${isActive ? activeBorder : inactiveBorder}`,
        // outer end-cap (top of standing tab)
        borderRight: `1px solid ${isActive ? activeBorder : inactiveBorder}`,
        // rail-outer long edge (left side of standing tab, away from card)
        borderLeft: `1px solid ${isActive ? activeBorder : inactiveBorder}`,
        // edge that touches the card. Active: drop it so the tab and card
        // visually merge into one open folder face.
        borderBottom: isActive ? 'none' : `1px solid ${inactiveBorder}`,
        transform: 'rotate(-90deg)',
        transformOrigin: 'center center',
        // Subtle inset on inactive tabs only, on the card-side edge.
        boxShadow: isActive
          ? 'none'
          : (isDark
            ? 'inset 0 -2px 4px rgba(0,0,0,0.35)'
            : 'inset 0 -2px 4px rgba(0,0,0,0.08)'),
      }}
    >
      <span
        style={isActive ? { color: 'var(--intent-success-fg)' } : undefined}
        className={`shrink-0 text-[9px] font-mono tabular-nums ${
        isActive
          ? ''
          : 'text-[var(--fg-subtle)]'
      }`}>
        {index}
      </span>
      <Icon className={`shrink-0 w-3 h-3 ${
        isActive
          ? 'text-[var(--fg-strong)]'
          : 'text-[var(--fg-subtle)]'
      }`} />
      <span
        className={`min-w-0 truncate font-bold tracking-tight ${
          isActive
            ? 'text-[var(--fg-strong)]'
            : 'text-[var(--fg-muted)]'
        }`}
        style={{ fontSize, lineHeight: 1 }}
      >
        {name}
      </span>
    </div>
  );
}

function HistoryButton({
  items, activeKey, isDark, thickness, onPick, onClose, repo, t,
}: {
  items: StackItem[]; activeKey: string; isDark: boolean; thickness: number;
  onPick: (key: string) => void;
  onClose: (key: string) => void;
  repo: RepoData;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Escape-to-close + focus trap (shared dialog a11y) and mousedown-outside
  // dismissal (shared hook). `close` is stable across renders so the hooks'
  // effect deps stay quiet.
  const close = useCallback(() => { setOpen(false); }, []);
  useDialogA11y(ref, open, close);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} className="relative pointer-events-auto shrink-0" style={{ height: thickness }}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); }}
        title={t('stack_axis.openTabs')}
        aria-label={t('stack_axis.openTabsHistory')}
        aria-expanded={open}
        className="flex items-center justify-center transition-colors text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
        style={{ width: thickness, height: thickness }}
      >
        <History className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-0 left-full ml-1 w-[240px] max-h-[60vh] overflow-y-auto scrollbar-hide rounded-xl border border-[var(--border-default)] shadow-2xl"
          style={{
            background: 'var(--bg-panel-strong)',
            ...(isDark ? {
              backdropFilter: 'blur(22px) saturate(160%)',
              WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            } : {}),
          }}
        >
          <div className="px-3 py-2 text-[9px] font-black uppercase tracking-[var(--track-eyebrow)] border-b text-[var(--fg-subtle)] border-[var(--border-default)]">
            {t('stack_axis.openTabsCount', { count: items.length })}
          </div>
          <div className="py-1">
            {items.map((it, i) => {
              const k = stackKey(it);
              const a = k === activeKey;
              const { name, sub } = itemLabel(it, repo, t);
              const Icon = it.kind === 'workspace' ? Boxes : it.kind === 'folder' ? Folder : FileCode;
              return (
                <div
                  key={k}
                  role="button"
                  tabIndex={0}
                  onClick={() => { onPick(k); setOpen(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPick(k);
                      setOpen(false);
                    }
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                    a
                      ? 'bg-[var(--bg-active)]'
                      : 'hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  {a && <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-[var(--fg-accent)] rounded-r" />}
                  <span
                    style={a ? { color: 'var(--intent-success-fg)' } : undefined}
                    className={`shrink-0 w-4 text-[9px] font-mono tabular-nums text-right ${
                    a ? '' : 'text-[var(--fg-subtle)]'
                  }`}>
                    {i + 1}
                  </span>
                  <Icon className={`shrink-0 w-3 h-3 ${
                    a ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-subtle)]'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[11px] font-bold truncate ${
                      a ? 'text-[var(--fg-strong)]' : 'text-[var(--fg-muted)]'
                    }`}>
                      {name}
                    </div>
                    <div className="text-[9px] font-mono truncate text-[var(--fg-subtle)]">
                      {sub}
                    </div>
                  </div>
                  {it.kind !== 'workspace' && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onClose(k); }}
                      className="shrink-0 p-0.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 text-[var(--fg-subtle)] hover:text-[var(--fg-strong)] hover:bg-[var(--bg-active)]"
                      title={t('stack_axis.closeTab')}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
