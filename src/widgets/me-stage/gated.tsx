// Mock↔real switch for me-stage pages. Every me page is now backend-wired: real mode renders
// its Real component, demo (mock auth) renders the seeded mock. Appearance/Preferences/Keyboard
// are client-only and exported straight from ./pages (no gate needed).
import { env } from '@shared/config/env';
import { ProfileReal } from './real/ProfileReal';
import { AccountReal } from './real/AccountReal';
import { SecurityReal } from './real/SecurityReal';
import { ApiTokensReal } from './real/ApiTokensReal';
import { InboxReal } from './real/InboxReal';
import { ConnectedAppsReal } from './real/ConnectedAppsReal';
import { AiReal } from './real/AiReal';
import { NotificationsReal } from './real/NotificationsReal';

import ProfileMock from './pages/ProfilePage';
import AccountMock from './pages/AccountPage';
import SecurityMock from './pages/SecurityPage';
import ConnectedAppsMock from './pages/ConnectedAppsPage';
import ApiTokensMock from './pages/ApiTokensPage';
import NotificationsMock from './pages/NotificationsPage';
import AiMock from './pages/AiPage';
import InboxMock from './pages/InboxPage';

export function ProfilePage() {
  return env.useRealAuth ? <ProfileReal /> : <ProfileMock />;
}
export function AccountPage() {
  return env.useRealAuth ? <AccountReal /> : <AccountMock />;
}
export function SecurityPage() {
  return env.useRealAuth ? <SecurityReal /> : <SecurityMock />;
}
export function ConnectedAppsPage() {
  return env.useRealAuth ? <ConnectedAppsReal /> : <ConnectedAppsMock />;
}
export function ApiTokensPage() {
  return env.useRealAuth ? <ApiTokensReal /> : <ApiTokensMock />;
}
export function NotificationsPage() {
  return env.useRealAuth ? <NotificationsReal /> : <NotificationsMock />;
}
export function AiPage() {
  return env.useRealAuth ? <AiReal /> : <AiMock />;
}
export function InboxPage() {
  return env.useRealAuth ? <InboxReal /> : <InboxMock />;
}
