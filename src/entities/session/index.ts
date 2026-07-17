// Public surface for the session entity — widgets/app import from here only.
export { useSession } from './model/useSession';
export {
  signInWithPassword,
  signUpWithPassword,
  signOut,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from './model/actions';
export {
  updateProfile,
  changeEmail,
  changePassword,
  requestAccountDeletion,
  listSessions,
  revokeSession,
  revokeOtherSessions,
  type ActiveSession,
} from './model/account';
