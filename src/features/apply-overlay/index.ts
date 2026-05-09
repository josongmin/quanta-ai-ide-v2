// Public API for the apply-overlay feature: the OverlayProvider/useOverlay
// store hook + the composed `OverlayPopover` (which bundles the heat /
// time-window / risk-lens / api-ring sub-pickers internally). The
// standalone `HeatOverlayPicker` is no longer mounted anywhere.
export { OverlayProvider, useOverlay } from './model/OverlayContext';
export { default as OverlayPopover } from './ui/OverlayPopover';
