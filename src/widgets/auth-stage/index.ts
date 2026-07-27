// Public surface of the auth-stage widget.
//
// Pages render the full auth flow. The OAuth-return overlay stays here (it is
// genuinely auth-specific). The generic form atoms moved to @shared/ui/forms
// (AuthField/AuthButton/AuthHRule) and the password-strength primitives to
// @features/password-strength — sibling widgets (onboarding, account settings)
// import them from there instead of reaching across widgets.
export { default as SignInPage }         from './SignInPage';
export { default as SignUpPage }         from './SignUpPage';
export { default as SsoRedirectPage }    from './SsoRedirectPage';
export { default as ForgotPasswordPage } from './ForgotPasswordPage';
export { default as ResetPasswordPage }  from './ResetPasswordPage';
export { default as VerifyEmailPage }    from './VerifyEmailPage';
export { default as MfaChallengePage }   from './MfaChallengePage';
export { default as SessionExpiredPage } from './SessionExpiredPage';
export { default as AcceptInvitationPage } from './AcceptInvitationPage';

export { OAuthRedirectOverlay } from './parts/OAuthRedirectOverlay';
