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
  const { isDark, toggle } = useTheme();
  const { draft, setDraft, dirty, savingState, save, discard } = useDirtyState(INITIAL);

  return (
    <MeShell
      title="Appearance"
      subtitle="Theme, density, motion, and accent. Most changes apply instantly so you can preview before saving."
    >
      <Section title="Theme" hint="Light, dark, or follow your operating system.">
        <ThemePicker
          value={draft.themeMode}
          onChange={(v) => {
            setDraft({ ...draft, themeMode: v });
            if (v === 'light' && isDark)  toggle();
            if (v === 'dark'  && !isDark) toggle();
          }}
        />
      </Section>

      <Section title="Accent color" hint="Used on primary CTAs, current-state markers, and the dot field hero color.">
        <AccentPicker
          value={draft.accent}
          onChange={(v) => { setDraft({ ...draft, accent: v }); }}
        />
      </Section>

      <Section title="Density" hint="How much space to give each row in dense lists like reviews and the file panel.">
        <DensityPicker
          value={draft.density}
          onChange={(v) => { setDraft({ ...draft, density: v }); }}
        />
      </Section>

      <Section title="Text" hint="Font scale and monospace family for code. Affects diffs and inline code blocks.">
        <Row label="Font scale" sub="Small (12px) · Medium (13px, default) · Large (15px) base.">
          <FontScaleToggle value={draft.fontScale} onChange={(v) => { setDraft({ ...draft, fontScale: v }); }} />
        </Row>
        <Row label="Monospace font" sub="Used in code, file paths, IDs.">
          <MonoFontPicker value={draft.monoFont} onChange={(v) => { setDraft({ ...draft, monoFont: v }); }} />
        </Row>
        <Row label="Syntax theme" sub="Color scheme inside diff hunks and code blocks.">
          <SyntaxPicker value={draft.syntaxTheme} onChange={(v) => { setDraft({ ...draft, syntaxTheme: v }); }} />
        </Row>
      </Section>

      <Section title="Accessibility" hint="Reduce visual noise where it gets in the way.">
        <Row label="Reduce motion" sub="Disables non-essential animations (panels, particles, transitions).">
          <Toggle checked={draft.reducedMotion} onChange={(v) => { setDraft({ ...draft, reducedMotion: v }); }} label="Reduce motion" />
        </Row>
        <Row label="High contrast" sub="Increases border contrast and removes muted text variants.">
          <Toggle checked={draft.highContrast} onChange={(v) => { setDraft({ ...draft, highContrast: v }); }} label="High contrast" />
        </Row>
      </Section>

      <Section title="Preview" hint="What a typical row looks like with your current selections.">
        <LivePreview settings={draft} />
      </Section>

      <Divider />

      <SaveBar visible={true} dirty={dirty} savingState={savingState} onSave={save} onDiscard={discard} />
    </MeShell>
  );
}
