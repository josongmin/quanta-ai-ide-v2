// Profile/Account/Security are backend-wired; the rest (connected-apps/api-
// tokens/notifications/ai/inbox) show OrgComingSoon in real mode. All gated in
// ./gated so the mock page files stay untouched.
export {
  ProfilePage, AccountPage, SecurityPage,
  ConnectedAppsPage, ApiTokensPage, NotificationsPage, AiPage, InboxPage,
} from './gated';

// Client-only pages (work identically in mock + real).
export { default as AppearancePage }  from './pages/AppearancePage';
export { default as PreferencesPage } from './pages/PreferencesPage';
export { default as KeyboardPage }    from './pages/KeyboardPage';
