// Turns the model's (untrusted) JSON answer into a product draft in the admin form's shape.
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import sanitizeHtml from 'sanitize-html';
import type { AiLanguageDraft, AiProductDraft, LanguageCode } from '@eshop/shared';

import { DraftDto, LanguageDraftDto } from './dto/ai-draft.dto';
import { LIMITS } from './draft-schema';
import { LlmError } from './providers/llm-provider';

const ALLOWED_TAGS = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'br'];

export interface MappedDraft {
  draft: AiProductDraft;
  suggestedCategories: string[];
  warnings: string[];
}

const describe = (errors: ValidationError[], path = ''): string[] =>
  errors.flatMap((error) => {
    const at = path ? `${path}.${error.property}` : error.property;
    return [...Object.values(error.constraints ?? {}).map((message) => `${at}: ${message}`), ...describe(error.children ?? [], at)];
  });

function validated<T extends object>(cls: new () => T, value: unknown, path: string): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new LlmError('invalid_output', `AI answer: ${path || 'root'} is not an object`);
  }
  const instance = plainToInstance(cls, value);
  const errors = validateSync(instance, { forbidUnknownValues: true });
  if (errors.length) {
    throw new LlmError('invalid_output', `AI answer failed validation: ${describe(errors, path).slice(0, 5).join('; ')}`);
  }
  return instance;
}

/** Lowercase ASCII slug with hyphens (diacritics removed) */
export const slugify = (text: string, max = 60): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');

/** Cuts plain text to `max` characters at a word boundary */
export const truncate = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '') + '…';
};

const plain = (text: string, max: number) => truncate(sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }), max);

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Full description: the model's HTML (allow-listed tags, no attributes) plus the attributes as a list */
export function renderDescription(html: string, attributes: { name: string; value: string }[]): string {
  const body = sanitizeHtml(html, { allowedTags: ALLOWED_TAGS, allowedAttributes: {} }).trim();
  const items = attributes
    .map((a) => ({ name: plain(a.name, LIMITS.attributeName), value: plain(a.value, LIMITS.attributeValue) }))
    .filter((a) => a.name && a.value)
    .slice(0, LIMITS.attributes)
    .map((a) => `<li><strong>${escapeHtml(a.name)}:</strong> ${escapeHtml(a.value)}</li>`);
  return [body, items.length ? `<ul>${items.join('')}</ul>` : ''].filter(Boolean).join('\n');
}

/**
 * Validates the answer (class-validator DTOs) and maps it to the admin form's product shape.
 * Throws LlmError('invalid_output') when the structure is wrong; trims texts that are too long.
 */
export function mapDraft(json: unknown, options: { languages: LanguageCode[]; categories: string[]; imageUrls: string[] }): MappedDraft {
  const root = validated(DraftDto, json, '');
  const translations = (json as { translations?: unknown }).translations;
  if (typeof translations !== 'object' || translations === null) {
    throw new LlmError('invalid_output', 'AI answer: translations missing');
  }

  const languages: Partial<Record<LanguageCode, AiLanguageDraft>> = {};
  for (const lang of options.languages) {
    const t = validated(LanguageDraftDto, (translations as Record<string, unknown>)[lang], `translations.${lang}`);
    languages[lang] = {
      title: plain(t.title, LIMITS.title),
      description: plain(t.shortDescription, LIMITS.shortDescription),
      descriptionFull: [renderDescription(t.descriptionHtml, t.attributes)],
      seoTitle: plain(t.seoTitle, LIMITS.seoTitle),
      metaDescription: plain(t.metaDescription, LIMITS.metaDescription),
    };
  }

  const warnings = root.warnings
    .map((w) => plain(w, LIMITS.warning))
    .filter(Boolean)
    .slice(0, LIMITS.warnings);

  // Categories: only existing ones survive (the schema enum already enforces this for Gemini)
  const allowed = new Set(options.categories);
  const requested = root.categories ?? [];
  const tags = [...new Set(requested.filter((c) => allowed.has(c)))].slice(0, LIMITS.categories);
  if (requested.some((c) => !allowed.has(c))) {
    warnings.push('Ignored categories that do not exist in the shop.');
  }

  const existing = new Set(options.categories.map((c) => slugify(c, 80)));
  const suggestedCategories = [
    ...new Set(
      root.suggestedCategories.map((c) => plain(c, LIMITS.categoryName)).filter((c) => c && !existing.has(slugify(c, 80)) && !allowed.has(c)),
    ),
  ].slice(0, LIMITS.suggestedCategories);

  const englishTitle = languages.en?.title ?? Object.values(languages)[0]?.title ?? '';
  const titleUrl = slugify(root.titleUrl) || slugify(englishTitle) || 'product';

  const images = options.imageUrls;
  return {
    draft: {
      titleUrl,
      tags,
      images,
      mainImage: { url: images[0] ?? '', name: titleUrl },
      ...languages,
    },
    suggestedCategories,
    warnings,
  };
}
