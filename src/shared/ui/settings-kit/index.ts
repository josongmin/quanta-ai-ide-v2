// Settings/admin UI kit — composable primitives that dedupe the confirmation
// dialogs, modal chrome, grid tables, search boxes, row menus, copy blocks, and
// empty states repeated 4–38× across org/ws/me-stage settings pages.
//
// These compose the lower-level shared primitives (ModalBackdrop, useDialogA11y,
// forms/Button) and reproduce the existing page markup byte-for-byte. They are
// theme-aware (CSS-var only) and carry no business logic.
export { ConfirmDialog } from './ConfirmDialog';
export { SettingsModal } from './SettingsModal';
export { SearchInput } from './SearchInput';
export { DataTable, type Column } from './DataTable';
export { RowMenu, type RowMenuItem } from './RowMenu';
export { CopyableCode } from './CopyableCode';
export { RevealOnceModal } from './RevealOnceModal';
export { EmptyState } from './EmptyState';
