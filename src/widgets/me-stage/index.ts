// All me-stage pages are backend-wired in real mode. Profile, Account, and
// Security use better-auth; ConnectedApps, ApiTokens, Notifications, AI, and
// Inbox pull from their respective backend endpoints. All gated in ./gated.
export {
  ProfilePage, AccountPage, SecurityPage,
  ConnectedAppsPage, ApiTokensPage, NotificationsPage, AiPage, InboxPage,
} from './gated';

// Client-only pages (work identically in mock + real).
export { default as AppearancePage }  from './pages/AppearancePage';
export { default as PreferencesPage } from './pages/PreferencesPage';
export { default as KeyboardPage }    from './pages/KeyboardPage';
