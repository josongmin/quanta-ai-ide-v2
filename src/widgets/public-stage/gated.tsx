// Mock↔real switch for the platform admin backoffice. The demo mock shows a
// full ops console (orgs/users/jobs/flags); real mode renders AdminReal wired to
// accounts /v1/admin/* (user directory + moderation + org plan override).
import { env } from '@shared/config/env';
import { AdminReal } from './real/AdminReal';
import AdminMock from './pages/AdminPage';

export function AdminPage() {
  return env.useRealAuth ? <AdminReal /> : <AdminMock />;
}
