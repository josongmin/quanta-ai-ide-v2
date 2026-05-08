// Public API for the apply-overlay feature: the OverlayProvider/useOverlay
// store hook, plus the composed `OverlayPopover` (which itself bundles the
// heat / time-window / risk-lens / api-ring sub-pickers internally) and the
// standalone `HeatOverlayPicker`.
export { OverlayProvider, useOverlay } from './model/OverlayContext';
export { default as HeatOverlayPicker } from './ui/HeatOverlayPicker';
export { default as OverlayPopover } from './ui/OverlayPopover';
