// Public API for the admission-rules feature: only the lazy entry component
// (`AdmissionRoot`). Internal v1/v2 workspaces and the Zustand store are
// reached via deep imports inside the slice.
export { default as AdmissionRoot } from './ui/AdmissionRoot';
