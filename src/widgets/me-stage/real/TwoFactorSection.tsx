import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { Section, Row, Field, Button } from '@shared/ui/forms';
import { Badge, SettingsModal, InlineError } from '@shared/ui';
import { useCopyToClipboard } from '@shared/lib';
import {
  useSession, enableTwoFactor, verifyTotp, disableTwoFactor, regenerateBackupCodes,
  type TotpEnrollment,
} from '@entities/session';

// Real TOTP two-factor enrollment over better-auth. Enable: confirm password →
// scan the QR / save backup codes → verify a code to activate. Disable: confirm
// password. useSession's twoFactorEnabled reactively reflects the result.
export function TwoFactorSection() {
  const { t } = useTranslation('me');
  const { user } = useSession();
  const enabled = Boolean(user?.twoFactorEnabled);
  const [flow, setFlow] = useState<null | 'enable' | 'disable' | 'regenerate'>(null);

  return (
    <Section title={t('real.security.twoFactor.title')} hint={t('real.security.twoFactor.hint')}>
      <Row
        label={t('real.security.twoFactor.label')}
        sub={enabled
          ? t('real.security.twoFactor.enabledSub')
          : t('real.security.twoFactor.disabledSub')}
      >
        {enabled ? (
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">{t('real.security.twoFactor.enabled')}</Badge>
            <Button onClick={() => { setFlow('regenerate'); }}>{t('real.security.twoFactor.regenerate')}</Button>
            <Button variant="danger" onClick={() => { setFlow('disable'); }}>{t('real.security.twoFactor.disable')}</Button>
          </div>
        ) : (
          <Button variant="primary" leading={<ShieldCheck className="w-3.5 h-3.5" />} onClick={() => { setFlow('enable'); }}>
            {t('real.security.twoFactor.enable')}
          </Button>
        )}
      </Row>

      {flow === 'enable' && <EnableModal onClose={() => { setFlow(null); }} />}
      {flow === 'disable' && <DisableModal onClose={() => { setFlow(null); }} />}
      {flow === 'regenerate' && <RegenerateModal onClose={() => { setFlow(null); }} />}
    </Section>
  );
}

function EnableModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('me');
  const [step, setStep] = useState<'password' | 'enroll'>('password');
  const [password, setPassword] = useState('');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard(1500);

  async function begin() {
    if (!password) return;
    setBusy(true);
    setError(null);
    const res = await enableTwoFactor({ password });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    if (!res.data.totpURI) { setError(t('real.security.twoFactor.enrollFailed')); return; }
    setEnrollment(res.data);
    setStep('enroll');
  }

  async function confirm() {
    if (code.trim().length < 6) return;
    setBusy(true);
    setError(null);
    const res = await verifyTotp({ code: code.trim() });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onClose(); // Active now — useSession reflects twoFactorEnabled.
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="md"
      icon={<ShieldCheck className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('real.security.twoFactor.enableTitle')}
      footer={
        step === 'password' ? (
          <>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" size="md" disabled={!password || busy} onClick={() => { void begin(); }}>
              {busy ? t('real.security.twoFactor.checking') : t('real.security.twoFactor.continue')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" size="md" disabled={code.trim().length < 6 || busy} onClick={() => { void confirm(); }}>
              {busy ? t('real.security.twoFactor.verifying') : t('real.security.twoFactor.verifyEnable')}
            </Button>
          </>
        )
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}

      {step === 'password' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {t('real.security.twoFactor.confirmPassword')}
          </p>
          <Field
            label={t('real.security.twoFactor.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            autoFocus
          />
        </div>
      ) : enrollment ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-md shrink-0" style={{ background: '#fff', border: '1px solid var(--border-default)' }}>
              <QRCodeSVG value={enrollment.totpURI} size={132} />
            </div>
            <div className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--fg-strong)' }}>{t('real.security.twoFactor.scanTitle')}</span>
              <span>{t('real.security.twoFactor.scanBody')}</span>
            </div>
          </div>

          {enrollment.backupCodes.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: 'var(--fg-subtle)' }}>
                  {t('real.security.twoFactor.backupSave')}
                </span>
                <Button
                  leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  onClick={() => { copy(enrollment.backupCodes.join('\n')); }}
                >
                  {copied ? t('real.security.twoFactor.copied') : t('real.security.twoFactor.copyAll')}
                </Button>
              </div>
              <div
                className="grid grid-cols-2 gap-1.5 p-2.5 rounded-md font-mono text-sm"
                style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-default)' }}
              >
                {enrollment.backupCodes.map((c) => <span key={c}>{c}</span>)}
              </div>
              <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>
                {t('real.security.twoFactor.backupNote')}
              </span>
            </div>
          )}

          <Field
            label={t('real.security.twoFactor.code')}
            inputMode="numeric"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }}
            placeholder={t('real.security.twoFactor.codePlaceholder')}
            autoFocus
          />
        </div>
      ) : null}
    </SettingsModal>
  );
}

function RegenerateModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('me');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard(1500);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setError(null);
    const res = await regenerateBackupCodes({ password });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setCodes(res.data.backupCodes); // old codes are now invalidated
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<ShieldCheck className="w-4 h-4" style={{ color: 'var(--fg-default)' }} />}
      title={t('real.security.twoFactor.regenerateTitle')}
      footer={
        codes ? (
          <Button variant="primary" size="md" onClick={onClose}>{t('real.security.twoFactor.done')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button variant="primary" size="md" disabled={!password || busy} onClick={() => { void submit(); }}>
              {busy ? t('real.security.twoFactor.generating') : t('real.security.twoFactor.regenerateAction')}
            </Button>
          </>
        )
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      {codes ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{t('real.security.twoFactor.newCodes')}</span>
            <Button
              leading={copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              onClick={() => { copy(codes.join('\n')); }}
            >
              {copied ? t('real.security.twoFactor.copied') : t('real.security.twoFactor.copyAll')}
            </Button>
          </div>
          <div
            className="grid grid-cols-2 gap-1.5 p-2.5 rounded-md font-mono text-sm"
            style={{ background: 'var(--bg-surface-muted)', border: '1px solid var(--border-muted)', color: 'var(--fg-default)' }}
          >
            {codes.map((c) => <span key={c}>{c}</span>)}
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {t('real.security.twoFactor.regenerateBody')}
          </p>
          <Field
            label={t('real.security.twoFactor.password')}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            autoFocus
          />
        </>
      )}
    </SettingsModal>
  );
}

function DisableModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('me');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setError(null);
    const res = await disableTwoFactor({ password });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onClose();
  }

  return (
    <SettingsModal
      open
      onClose={onClose}
      size="sm"
      icon={<ShieldCheck className="w-4 h-4" style={{ color: 'var(--intent-danger-fg)' }} />}
      title={t('real.security.twoFactor.disableTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" size="md" disabled={!password || busy} onClick={() => { void submit(); }}>
            {busy ? t('real.security.twoFactor.disabling') : t('real.security.twoFactor.disableAction')}
          </Button>
        </>
      }
    >
      {error && <InlineError message={error} onRetry={() => { setError(null); }} />}
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {t('real.security.twoFactor.disableBody')}
      </p>
      <Field
        label={t('real.security.twoFactor.password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); }}
        autoFocus
      />
    </SettingsModal>
  );
}
