// Module-private style tokens shared across onboarding steps. These are the
// byte-identical literals that recurred in 6+ step sub-components; centralizing
// them keeps the rendered output identical while removing copy-paste drift.

// Accent tint used for "recognized / success-ish" panels and badges.
export const ACCENT_TINT = 'color-mix(in srgb, var(--fg-accent) 14%, transparent)';

// The terse uppercase section/field label shared by fieldsets and labels.
export const SECTION_LABEL_CLASS =
  'text-xs uppercase tracking-eyebrow font-medium';
