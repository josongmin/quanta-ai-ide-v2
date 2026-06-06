export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'comfortable' | 'roomy';
export type FontScale = 'sm' | 'md' | 'lg';
export type Accent = 'cobalt' | 'amber' | 'violet' | 'crimson' | 'mint';

export type Appearance = {
  themeMode: ThemeMode;
  accent: Accent;
  density: Density;
  fontScale: FontScale;
  reducedMotion: boolean;
  highContrast: boolean;
  monoFont: 'jetbrains' | 'sf-mono' | 'fira' | 'system';
  syntaxTheme: 'dim' | 'midnight' | 'paper' | 'solarized';
};

export const INITIAL: Appearance = {
  themeMode: 'system',
  accent: 'cobalt',
  density: 'comfortable',
  fontScale: 'md',
  reducedMotion: false,
  highContrast: false,
  monoFont: 'jetbrains',
  syntaxTheme: 'dim',
};
