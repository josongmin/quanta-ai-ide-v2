import { useFilterRepo } from '@entities/filter-state';
import { useTranslation } from '@shared/i18n';
import { ResizeHandle } from '@shared/ui';
// Layout constants live in the shared SoT (features may import @shared freely —
// no boundary violation; the earlier local copy was avoidable duplication).
import { INTELLIGENCE_LAYOUT } from '@shared/lib/panelLayout';
import { useShortcut, clamp } from '@shared/lib';
import { useStack, stackKey } from '../model/StackContext';
import FocusScanPanel from './focus-scan/FocusScanPanel';
import InspectPanel from './InspectPanel';
import { itemLabel } from './parts/stackLabel';
import { CrestTab } from './parts/CrestTab';
import { HistoryButton } from './parts/HistoryButton';

type Props = {
  isDark: boolean;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  onWidthChange: (next: number) => void;
};

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

  // Alt+←/→ cycles the inspect stack. Routed through the shared keybinding
  // authority so it is scope-aware (fires only while the intelligence surface is
  // active) and suppressed under a modal; ignoreInputs covers the editable guard.
  useShortcut({ key: 'ArrowLeft', alt: true, ignoreInputs: true }, () => {
    if (items.length === 0) return;
    activate(stackKey(items[(idx - 1 + items.length) % items.length]));
  });
  useShortcut({ key: 'ArrowRight', alt: true, ignoreInputs: true }, () => {
    if (items.length === 0) return;
    activate(stackKey(items[(idx + 1) % items.length]));
  });

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
    return clamp(raw, TAB_MIN_LENGTH, TAB_MAX_LENGTH);
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
          ? (() => {
              // `active.id` is a dense index into repo.files. A stale stack entry
              // (e.g. repo reloaded with fewer files) can leave it out of range,
              // which would hand FocusScanPanel an undefined FileRecord. Guard the
              // same way SimilarDrawer does (`if (!f) return null`).
              const file = repo.files[active.id];
              return file ? <FocusScanPanel file={file} isDark={isDark} embedded /> : null;
            })()
          : <InspectPanel
              isDark={isDark}
              target={active.kind === 'workspace' ? { kind: 'workspace' } : { kind: 'folder', path: active.path }}
            />}
      </div>
      </div>
    </>
  );
}
