import { MeShell } from '../parts/MeShell';
import { EmailSection } from './parts/account/EmailSection';
import { PasswordSection } from './parts/account/PasswordSection';
import { ExportSection } from './parts/account/ExportSection';
import { DangerSection } from './parts/account/DangerSection';

export default function AccountPage() {
  return (
    <MeShell
      title="Account"
      subtitle="Email, password, exports, and account deletion."
    >
      <EmailSection />
      <PasswordSection />
      <ExportSection />
      <DangerSection />
    </MeShell>
  );
}
