// Password-strength feature slice.
//
// Pure client-side password evaluation (`evaluatePassword`) plus the meter/
// rule-chip UI (`PasswordStrengthPanel`). Reusable across auth pages and
// account-settings password changes without a widget→widget dependency.
export {
  evaluatePassword,
  type PasswordRule,
  type PasswordReport,
} from './model/passwordRules';
export { PasswordStrengthPanel } from './ui/PasswordStrengthPanel';
