// Public surface of the shared UI kit. Feature/widget code should import
// from here rather than reaching into individual files.
//
// Anything in this folder must:
//   • only depend on tokens + other shared/ui
//   • be theme-aware via CSS variables (no hard-coded colors)
//   • carry no business logic

// ── Layout / surfaces ──
export { ErrorBoundary } from './ErrorBoundary';
export { GlassCard } from './GlassCard';
export { ScrollPane } from './ScrollPane';
export { SectionHeader } from './SectionHeader';
export { Section } from './Section';

// ── Primitives ──
export { Portal } from './Portal';
export { Modal } from './Modal';
export { ModalBackdrop, type ModalBackdropProps } from './ModalBackdrop';
export { Popover } from './Popover';
export { useDialogA11y } from './useDialogA11y';
export { IconButton } from './IconButton';
export { Switch } from './Switch';
export { SegmentedControl } from './SegmentedControl';
export { Pill } from './Pill';
export { Badge } from './Badge';
export { ResizeHandle } from './ResizeHandle';
export { SideNavShell, type SideNavItem, type SideNavGroup } from './SideNavShell';
export { Drawer } from './Drawer';
export { TabBar } from './TabBar';
export { PanelFooter } from './PanelFooter';

// ── Data display ──
export { Score } from './Score';
export { Stat } from './Stat';
export { BarRow } from './BarRow';
export { ConfidenceMeter } from './ConfidenceMeter';
export { FileRow } from './FileRow';
export { StackedRatioBar } from './StackedRatioBar';
export { EmptyHint } from './EmptyHint';
