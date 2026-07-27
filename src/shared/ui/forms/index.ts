// Settings/form primitive kit — horizontal label-left/control-right rhythm
// used across me-stage, ws-stage, org-stage settings pages.
//
// Distinct from <Section> in ../Section.tsx (Intelligence inspect / focus
// panels): that one is an eyebrow + GlassCard surface. This one is a
// settings page section header. Both are intentionally kept separate;
// import this kit via `@shared/ui/forms`.
export {
  Section,
  Divider,
  Row,
  Field,
  Textarea,
  Toggle,
  Checkbox,
  Select,
  Button,
  SaveBar,
} from './primitives';

// Vertical auth/onboarding form atoms (label-above-input). Kept as distinct
// exports from the horizontal settings Field/Button above — different public
// API and rhythm, so they must not collide.
export {
  AuthField,
  AuthButton,
  AuthHRule,
} from './authAtoms';
