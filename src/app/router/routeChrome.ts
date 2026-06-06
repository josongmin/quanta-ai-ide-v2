// Chrome decision registry for the root layout.
//
// Auth, onboarding, public/marketing/legal, and the super-admin console all
// render full-bleed — without the AppShell chrome (header, GNB, modals).
// Each owns its own shell (AuthStage / PublicShell / AdminShell).
//
// RootLayout used to inline a ~22-line boolean hardcoding every chromeless
// pathname. That predicate now lives here as a list of matchers so the rule
// set is testable and the layout stays declarative. Matching behavior is a
// faithful port of the original `isAuth || isPublic` branch.

type Matcher = (pathname: string) => boolean;

const exact = (path: string): Matcher => (p) => p === path;
const prefix = (path: string): Matcher => (p) => p.startsWith(path);

const CHROMELESS_MATCHERS: Matcher[] = [
  // Auth + onboarding render full-bleed without GNB chrome.
  prefix('/auth'),
  prefix('/onboarding'),
  // Public / marketing / legal pages and the super-admin internal console.
  exact('/pricing'),
  exact('/changelog'),
  exact('/help'),
  exact('/status'),
  exact('/integrations'),
  prefix('/integrations/'),
  exact('/trust'),
  exact('/security'),
  exact('/support'),
  exact('/contact-sales'),
  exact('/feedback'),
  exact('/whats-new'),
  exact('/roadmap'),
  exact('/accessibility'),
  exact('/maintenance'),
  exact('/offline'),
  exact('/_errors/404'),
  exact('/_errors/500'),
  prefix('/legal/'),
  prefix('/_admin'),
];

/**
 * True when `pathname` should render full-bleed (no AppShell chrome).
 */
export function isChromeless(pathname: string): boolean {
  return CHROMELESS_MATCHERS.some((match) => match(pathname));
}
