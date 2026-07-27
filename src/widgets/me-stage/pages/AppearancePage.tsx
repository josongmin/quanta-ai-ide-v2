import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/theme';
import { MeShell } from '../parts/MeShell';
import { Section, Row, Toggle, Divider, SaveBar } from '@shared/ui/forms';
import { useDirtyState } from '../lib/useDirtyState';
import { INITIAL } from './parts/appearance/types';
import { ThemePicker } from './parts/appearance/ThemePicker';
import { AccentPicker } from './parts/appearance/AccentPicker';
import { DensityPicker } from './parts/appearance/DensityPicker';
import { FontScaleToggle, MonoFontPicker, SyntaxPicker } from './parts/appearance/TextPickers';
import { LivePreview } from './parts/appearance/LivePreview';

export default function AppearancePage() {
  const { t } = useTranslation('me');
  const { isDark, toggle } = useTheme();
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title={t('appearance.title')}
      subtitle={t('appearance.subtitle')}
    >
      <Section title={t('appearance.theme.title')} hint={t('appearance.theme.hint')}>
        <ThemePicker
          value={draft.themeMode}
          onChange={(v) => {
            setDraft({ ...draft, themeMode: v });
            if (v === 'light' && isDark)  toggle();
            if (v === 'dark'  && !isDark) toggle();
          }}
        />
      </Section>

      <Section title={t('appearance.accent.title')} hint={t('appearance.accent.hint')}>
        <AccentPicker
          value={draft.accent}
          onChange={(v) => { setDraft({ ...draft, accent: v }); }}
        />
      </Section>

      <Section title={t('appearance.density.title')} hint={t('appearance.density.hint')}>
        <DensityPicker
          value={draft.density}
          onChange={(v) => { setDraft({ ...draft, density: v }); }}
        />
      </Section>

      <Section title={t('appearance.text.title')} hint={t('appearance.text.hint')}>
        <Row label={t('appearance.text.fontScale')} sub={t('appearance.text.fontScaleSub')}>
          <FontScaleToggle value={draft.fontScale} onChange={(v) => { setDraft({ ...draft, fontScale: v }); }} />
        </Row>
        <Row label={t('appearance.text.monoFont')} sub={t('appearance.text.monoFontSub')}>
          <MonoFontPicker value={draft.monoFont} onChange={(v) => { setDraft({ ...draft, monoFont: v }); }} />
        </Row>
        <Row label={t('appearance.text.syntaxTheme')} sub={t('appearance.text.syntaxThemeSub')}>
          <SyntaxPicker value={draft.syntaxTheme} onChange={(v) => { setDraft({ ...draft, syntaxTheme: v }); }} />
        </Row>
      </Section>

      <Section title={t('appearance.a11y.title')} hint={t('appearance.a11y.hint')}>
        <Row label={t('appearance.a11y.reduceMotion')} sub={t('appearance.a11y.reduceMotionSub')}>
          <Toggle checked={draft.reducedMotion} onChange={(v) => { setDraft({ ...draft, reducedMotion: v }); }} label={t('appearance.a11y.reduceMotion')} />
        </Row>
        <Row label={t('appearance.a11y.highContrast')} sub={t('appearance.a11y.highContrastSub')}>
          <Toggle checked={draft.highContrast} onChange={(v) => { setDraft({ ...draft, highContrast: v }); }} label={t('appearance.a11y.highContrast')} />
        </Row>
      </Section>

      <Section title={t('appearance.previewSection.title')} hint={t('appearance.previewSection.hint')}>
        <LivePreview settings={draft} />
      </Section>

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
