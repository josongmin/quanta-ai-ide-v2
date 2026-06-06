import { useState } from 'react';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Divider } from '@shared/ui/forms';
import { INITIAL_METHODS, type MfaKind, type MfaMethod } from './parts/security/types';
import { MfaSection } from './parts/security/MfaSection';
import { RecoverySection, RecoveryCodesModal } from './parts/security/RecoverySection';
import { AddMfaModal } from './parts/security/AddMfaModal';
import { SessionsSection } from './parts/security/SessionsSection';
import { HistorySection } from './parts/security/HistorySection';
import { SignOutEverywhere } from './parts/security/SignOutEverywhere';

export default function SecurityPage() {
  const [methods, setMethods] = useState<MfaMethod[]>(INITIAL_METHODS);
  const [trustDevicesEnabled, setTrustDevicesEnabled] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [showAdd, setShowAdd] = useState<MfaKind | null>(null);

  return (
    <MeShell
      title="Security"
      subtitle="Two-factor methods, active sessions, and your sign-in history."
    >
      <MfaSection
        methods={methods}
        onMakePrimary={(id) => { setMethods((m) => m.map((x) => ({ ...x, primary: x.id === id }))); }}
        onRemove={(id) => { setMethods((m) => m.filter((x) => x.id !== id)); }}
        onAdd={(kind) => { setShowAdd(kind); }}
      />

      <RecoverySection onShow={() => { setShowCodes(true); }} />

      <Section
        title="Trusted devices"
        hint="When enabled, devices that have completed 2FA can skip future prompts for 30 days."
      >
        <Row
          label="Trust this device after 2FA"
          sub="A signed cookie stays on the device. Removing the cookie or signing out resets it."
        >
          <Toggle checked={trustDevicesEnabled} onChange={setTrustDevicesEnabled} label="Trust device" />
        </Row>
      </Section>

      <SessionsSection />

      <HistorySection />

      <Divider />

      <SignOutEverywhere />

      {showCodes && <RecoveryCodesModal onClose={() => { setShowCodes(false); }} />}
      {showAdd && (
        <AddMfaModal
          kind={showAdd}
          onClose={() => { setShowAdd(null); }}
          onAdded={(method) => {
            setMethods((m) => [...m, method]);
            setShowAdd(null);
          }}
        />
      )}
    </MeShell>
  );
}
