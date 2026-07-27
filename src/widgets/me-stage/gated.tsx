// Mock↔real switch for me-stage pages. Profile/Account/Security are wired to
// better-auth; the rest (connected apps / API tokens / notifications / AI /
// inbox) need backends that land in Phase 2-3, so real mode shows MeComingSoon
// instead of the demo's fabricated data. Appearance/Preferences/Keyboard are
// client-only and exported straight from ./pages (no gate needed).
import { useTranslation } from 'react-i18next';
import { env } from '@shared/config/env';
import { MeComingSoon } from './real/MeComingSoon';
import { ProfileReal } from './real/ProfileReal';
import { AccountReal } from './real/AccountReal';
import { SecurityReal } from './real/SecurityReal';
import { ApiTokensReal } from './real/ApiTokensReal';
import { InboxReal } from './real/InboxReal';
import { ConnectedAppsReal } from './real/ConnectedAppsReal';

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
  const { t } = useTranslation('me');
  return env.useRealAuth ? <MeComingSoon title={t('comingSoon.notifications')} /> : <NotificationsMock />;
}
export function AiPage() {
  const { t } = useTranslation('me');
  return env.useRealAuth ? <MeComingSoon title={t('comingSoon.ai')} /> : <AiMock />;
}
export function InboxPage() {
  return env.useRealAuth ? <InboxReal /> : <InboxMock />;
}
