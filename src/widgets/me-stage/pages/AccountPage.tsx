import { useTranslation } from 'react-i18next';
import { MeShell } from '../parts/MeShell';
import { EmailSection } from './parts/account/EmailSection';
import { PasswordSection } from './parts/account/PasswordSection';
import { ExportSection } from './parts/account/ExportSection';
import { DangerSection } from './parts/account/DangerSection';

export default function AccountPage() {
  const { t } = useTranslation('me');
  return (
    <MeShell
      title={t('account.title')}
      subtitle={t('account.subtitle')}
    >
      <EmailSection />
      <PasswordSection />
      <ExportSection />
      <DangerSection />
    </MeShell>
  );
}
