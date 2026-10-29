// Ready-made looks for the theme editor. A preset sets only the look (accent color and hero tint);
// the shop name, logo, hero media and home sections stay as they are.
import type { ThemeStyles } from '@eshop/shared';

export interface ThemePreset {
  id: string;
  label: string;
  /** Empty = the default ink */
  primaryColor: string;
  heroTint: Exclude<ThemeStyles['heroTint'], '' | undefined>;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'ink', label: 'Ink', primaryColor: '', heroTint: 'none' },
  { id: 'forest', label: 'Forest', primaryColor: '#15803d', heroTint: 'none' },
  { id: 'ember', label: 'Ember', primaryColor: '#c2410c', heroTint: 'warm' },
  { id: 'glacier', label: 'Glacier', primaryColor: '#0369a1', heroTint: 'none' },
  { id: 'heather', label: 'Heather', primaryColor: '#9d174d', heroTint: 'warm' },
];
