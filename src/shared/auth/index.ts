// Public surface — consumed only by entities/session, entities/org, and the
// app-layer guard/init. Kept tight so knip doesn't flag unused re-exports.
export { authClient } from './authClient';
export { accountsApi } from './accountsFetch';
export {
  normalizeResult, normalizeError, normalizeData,
  type ActionResult, type ActionData,
} from './result';
