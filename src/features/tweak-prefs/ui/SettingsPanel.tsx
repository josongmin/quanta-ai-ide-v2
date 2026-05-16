import { lazy, Suspense, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from '@shared/i18n';
import { Modal } from '@shared/ui';

// Body lazy-loaded so the FACET/CATEGORIES tables and the settings parts/*
// modules stay out of the initial bundle. The trigger button is rendered
// eagerly so the GNB chrome paints in one frame.
const SettingsBody = lazy(() => import('./SettingsBody'));

export default function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsTrigger compact={compact} onOpen={() => { setOpen(true); }} />
      <Modal
        open={open}
        onClose={() => { setOpen(false); }}
        width="100%"
        maxWidth={720}
        ariaLabelledBy="settings-title"
        ariaDescribedBy="settings-subtitle"
        align="top"
      >
        <Suspense fallback={null}>
          <SettingsBody onClose={() => { setOpen(false); }} />
        </Suspense>
      </Modal>
    </>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────

function SettingsTrigger({ compact, onOpen }: { compact: boolean; onOpen: () => void }) {
  const { t } = useTranslation('prefs');

  if (compact) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title={t('openTitle')}
        aria-label={t('openAria')}
        className="p-2 rounded-full transition-all active:scale-95 hover-surface"
        style={{
          color: 'var(--fg-muted)',
          background: 'transparent',
        }}
      >
        <Settings2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-colors hover-surface"
      style={{
        background: 'var(--bg-surface-muted, transparent)',
        borderColor: 'var(--border-muted)',
        color: 'var(--fg-muted)',
      }}
    >
      <Settings2 className="w-3.5 h-3.5" />
      {t('buttonLabel')}
    </button>
  );
}
