// Public surface of the auth-stage widget.
//
// Pages render the full auth flow. The form atoms (Field/Button/HRule/
// OAuthGrid), the password-strength panel, the OAuth-return overlay, and
// the `evaluatePassword` helper are exported so sibling widgets that
// share the auth visual language (onboarding wizards, account settings
// pages with password changes) can compose them without reaching into
// auth-stage's internals via deep imports.
export { default as SignInPage }         from './SignInPage';
export { default as SignUpPage }         from './SignUpPage';
export { default as SsoRedirectPage }    from './SsoRedirectPage';
export { default as ForgotPasswordPage } from './ForgotPasswordPage';
export { default as ResetPasswordPage }  from './ResetPasswordPage';
export { default as VerifyEmailPage }    from './VerifyEmailPage';
export { default as MfaChallengePage }   from './MfaChallengePage';
export { default as SessionExpiredPage } from './SessionExpiredPage';

export { Field, Button, HRule, OAuthGrid } from './parts/AuthForm';
export { PasswordStrengthPanel } from './parts/PasswordStrengthPanel';
export { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
export {
  evaluatePassword,
  type PasswordRule,
  type PasswordReport,
} from './lib/passwordRules';
