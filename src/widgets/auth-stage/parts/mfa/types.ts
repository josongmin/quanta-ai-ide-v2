export type Method = 'totp' | 'webauthn' | 'backup';
export type Phase  = 'challenge' | 'verifying' | 'success' | 'wrong-code' | 'low-backup';

// Demo TOTP code so reviewers can see success/failure deterministically.
// Real apps verify against the user's secret; this demo accepts only this
// exact 6-digit value.
export const DEMO_TOTP = '482917';
