// Public surface — re-exports the ThemePreset type, the apply helpers
// (in case anything outside imported them; original file did not export
// them), and the curated DARK_PRESETS / LIGHT_PRESETS registries.

import { makeDarkPreset, makeLightPreset } from './palette-type';
import {
  oneDark, tokyoNight, githubDark, nord, dracula, solarizedDark, monokaiPro,
  materialOcean, catppuccinMocha, gruvboxDark, kanagawaWave, rosePineMoon,
  everforestDark, nightOwl, gruvboxMaterial, ayuMirage, palenight, horizon,
} from './dark-palettes';
import {
  githubLight, oneLight, solarizedLight, tokyoNightLight, catppuccinLatte,
  gruvboxLight, rosePineDawn, ayuLight, kanagawaLotus, quietLight, nightOwlLight,
} from './light-palettes';
import type { ThemePreset } from './palette-type';

export type { ThemePreset } from './palette-type';

export const DARK_PRESETS: ThemePreset[] = [
  makeDarkPreset('one-dark', oneDark),
  makeDarkPreset('tokyo-night', tokyoNight),
  makeDarkPreset('github-dark', githubDark),
  makeDarkPreset('nord', nord),
  makeDarkPreset('dracula', dracula),
  makeDarkPreset('solarized-dark', solarizedDark),
  makeDarkPreset('monokai-pro', monokaiPro),
  makeDarkPreset('material-ocean', materialOcean),
  makeDarkPreset('catppuccin-mocha', catppuccinMocha),
  makeDarkPreset('gruvbox-dark', gruvboxDark),
  makeDarkPreset('kanagawa-wave', kanagawaWave),
  makeDarkPreset('rose-pine-moon', rosePineMoon),
  makeDarkPreset('everforest-dark', everforestDark),
  makeDarkPreset('night-owl', nightOwl),
  makeDarkPreset('gruvbox-material', gruvboxMaterial),
  makeDarkPreset('ayu-mirage', ayuMirage),
  makeDarkPreset('palenight', palenight),
  makeDarkPreset('horizon', horizon),
];

export const LIGHT_PRESETS: ThemePreset[] = [
  makeLightPreset('github-light', githubLight),
  makeLightPreset('one-light', oneLight),
  makeLightPreset('solarized-light', solarizedLight),
  makeLightPreset('tokyo-night-light', tokyoNightLight),
  makeLightPreset('catppuccin-latte', catppuccinLatte),
  makeLightPreset('gruvbox-light', gruvboxLight),
  makeLightPreset('rose-pine-dawn', rosePineDawn),
  makeLightPreset('ayu-light', ayuLight),
  makeLightPreset('kanagawa-lotus', kanagawaLotus),
  makeLightPreset('quiet-light', quietLight),
  makeLightPreset('night-owl-light', nightOwlLight),
];
