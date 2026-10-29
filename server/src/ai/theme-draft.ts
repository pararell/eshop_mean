// AI theme drafts (docs/ai.md § Theme drafts): from a short brief, the model proposes the look (accent
// color, hero tint), a shop name and the texts of a photo band in every language. The answer is
// untrusted: it is validated here, texts are plain and cut to their limits, and nothing is saved; the
// theme editor fills its form and the admin saves.
import type { AiThemeDraft, LanguageCode } from '@eshop/shared';

import { LANGUAGE_NAMES } from './draft-schema';
import { truncate } from './draft-mapper';
import { LlmError } from './providers/llm-provider';

export const THEME_LIMITS = { brief: 500, shopName: 60, title: 120, text: 300, button: 40 } as const;

export const THEME_DRAFT_TOOL = { name: 'save_theme_draft', description: 'Save the shop theme draft for the shop admin to review.' };

const str = (description: string) => ({ type: 'string', description });

export function buildThemeSchema(languages: LanguageCode[]): Record<string, unknown> {
  const band = {
    type: 'object',
    properties: {
      title: str(`A short headline for a full-width photo band on the home page, at most ${THEME_LIMITS.title / 2} characters.`),
      text: str(`One plain sentence under the headline, at most ${THEME_LIMITS.text / 2} characters.`),
      button: str(`A button label of 1 to 3 words, at most ${THEME_LIMITS.button / 2} characters.`),
    },
    required: ['title', 'text', 'button'],
  };
  return {
    type: 'object',
    properties: {
      primaryColor: str('The brand accent as a hex color #rrggbb. Buttons and links use it, so pick a saturated, not a pale, color.'),
      heroTint: { type: 'string', enum: ['none', 'warm'], description: "'warm' gives the hero photo a sunlit tint; 'none' keeps its colors." },
      shopName: str(`A short shop name, at most ${THEME_LIMITS.shopName} characters. Keep the name from the brief if it gives one.`),
      band: {
        type: 'object',
        properties: Object.fromEntries(languages.map((lang) => [lang, { ...band, description: `Texts in ${LANGUAGE_NAMES[lang]}.` }])),
        required: languages,
      },
    },
    required: ['primaryColor', 'heroTint', 'shopName', 'band'],
  };
}

export function buildThemeSystemPrompt(languages: LanguageCode[]): string {
  return [
    'You design the look of an online shop for outdoor and hiking gear.',
    'From the brief, choose an accent color and whether the hero photo gets a warm tint, suggest a short shop name,',
    `and write a photo band for the home page in ${languages.map((lang) => LANGUAGE_NAMES[lang]).join(', ')}.`,
    'Texts are plain text without HTML, natural in each language (not word-for-word translations), and never promise',
    'prices, discounts or delivery times that the brief does not state.',
  ].join(' ');
}

export function buildThemeUserPrompt(brief: string): string {
  return `Brief from the shop admin:\n${brief}`;
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

/** Plain text: tags removed, whitespace collapsed, cut at a word boundary */
const plain = (value: unknown, max: number): string => (typeof value === 'string' ? truncate(value.replace(/<[^>]*>/g, ' '), max) : '');

/** Validates the model's answer; structural problems reject it (the service then retries once) */
export function mapThemeDraft(json: unknown, languages: LanguageCode[]): AiThemeDraft {
  const invalid = (what: string) => new LlmError('invalid_output', `AI theme answer: ${what}`);
  if (!isObject(json)) throw invalid('not an object');
  const { primaryColor, heroTint, shopName, band } = json;
  if (typeof primaryColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(primaryColor.trim())) throw invalid('primaryColor is not a #rrggbb color');
  if (heroTint !== 'none' && heroTint !== 'warm') throw invalid('heroTint is not none or warm');
  if (!isObject(band)) throw invalid('band is not an object');

  return {
    primaryColor: primaryColor.trim().toLowerCase(),
    heroTint,
    shopName: plain(shopName, THEME_LIMITS.shopName),
    band: Object.fromEntries(
      languages.map((lang) => {
        const texts = band[lang];
        if (!isObject(texts)) throw invalid(`band.${lang} is missing`);
        const title = plain(texts['title'], THEME_LIMITS.title);
        if (!title) throw invalid(`band.${lang}.title is empty`);
        return [lang, { title, text: plain(texts['text'], THEME_LIMITS.text), button: plain(texts['button'], THEME_LIMITS.button) }];
      }),
    ),
  };
}
