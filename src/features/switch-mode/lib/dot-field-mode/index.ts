// Public surface for DotFieldMode. The registry.ts hot-path uses dynamic
// import — re-exporting from `mode.ts` keeps the original `createDotFieldMode`
// named export reachable via the directory name.
export { createDotFieldMode } from './mode';
