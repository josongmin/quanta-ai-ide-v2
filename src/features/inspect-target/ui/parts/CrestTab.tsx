import { Boxes, Folder, FileCode } from 'lucide-react';
import { type StackItem } from '../../model/StackContext';

// One vertical "folder crest" tab in the left rail of FocusScanStack.
export function CrestTab({
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
        className={`shrink-0 text-2xs font-mono tabular-nums ${
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
