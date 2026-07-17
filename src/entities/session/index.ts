// Public surface for the session entity — widgets/app import from here only.
export { useSession } from './model/useSession';
export {
  signInWithPassword,
  signInWithProvider,
  signUpWithPassword,
  signOut,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  type SignInResult,
  type OAuthProvider,
} from './model/actions';
export {
  enableTwoFactor,
  verifyTotp,
  verifyBackupCode,
  disableTwoFactor,
  regenerateBackupCodes,
  type TotpEnrollment,
} from './model/twoFactor';
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
export {
  listPersonalTokens,
  createPersonalToken,
  revokePersonalToken,
  type ApiKeyRecord,
  type ApiKeyCreated,
} from './model/apiKeys';
