// Public surface of the shared UI kit. Feature/widget code should import
// from here rather than reaching into individual files.
//
// Anything in this folder must:
//   • only depend on tokens + other shared/ui
//   • be theme-aware via CSS variables (no hard-coded colors)
//   • carry no business logic

// ── Layout / surfaces ──
export { GlassCard, SectionHeader } from './GlassCard';
export { Section } from './Section';
export { PanelFooter } from './PanelFooter';
export { TabBar } from './TabBar';

// ── Primitives ──
export { Portal } from './Portal';
export { Modal } from './Modal';
export { Drawer } from './Drawer';
export { Popover } from './Popover';
export { useDialogA11y } from './useDialogA11y';
export { Badge } from './Badge';
export { Button } from './Button';
export { IconButton } from './IconButton';
export { Switch } from './Switch';
export { SegmentedControl } from './SegmentedControl';
export { Pill } from './Pill';
export { Surface } from './Surface';
export { Row } from './Row';
export { ResizeHandle } from './ResizeHandle';
export { useTopRightInset, useReserveTopRightInset } from './topRightInset';

// ── Data display ──
export { Score } from './Score';
export { Stat } from './Stat';
export { BarRow } from './BarRow';
export { ConfidenceMeter } from './ConfidenceMeter';
export { FileRow } from './FileRow';
export { StackedRatioBar } from './StackedRatioBar';
export { EmptyHint } from './EmptyHint';
