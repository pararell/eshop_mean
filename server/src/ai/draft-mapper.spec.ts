import { LlmError } from './providers/llm-provider';
import { mapDraft, renderDescription, slugify, truncate } from './draft-mapper';

const lang = (title: string, overrides: Record<string, unknown> = {}) => ({
  title,
  shortDescription: `${title} short`,
  descriptionHtml: '<p>Body</p>',
  attributes: [{ name: 'Colour', value: 'black' }],
  seoTitle: `${title} SEO`,
  metaDescription: `${title} meta`,
  ...overrides,
});

const answer = (overrides: Record<string, unknown> = {}) => ({
  titleUrl: 'winter-jacket',
  categories: ['jackets'],
  suggestedCategories: [],
  warnings: [],
  translations: { en: lang('Jacket'), sk: lang('Bunda'), cs: lang('Bunda CZ') },
  ...overrides,
});

const options = { languages: ['en', 'sk', 'cs'] as ('en' | 'sk' | 'cs')[], categories: ['jackets', 'coats'], imageUrls: ['https://img/1.jpg'] };

const invalid = (json: unknown) => {
  try {
    mapDraft(json, options);
  } catch (error) {
    expect(error).toBeInstanceOf(LlmError);
    expect((error as LlmError).kind).toBe('invalid_output');
    return (error as LlmError).message;
  }
  throw new Error('expected invalid_output');
};

describe('mapDraft', () => {
  it('maps the answer to the admin form shape', () => {
    const { draft, warnings, suggestedCategories } = mapDraft(answer(), options);
    expect(draft).toEqual({
      titleUrl: 'winter-jacket',
      tags: ['jackets'],
      images: ['https://img/1.jpg'],
      mainImage: { url: 'https://img/1.jpg', name: 'winter-jacket' },
      en: {
        title: 'Jacket',
        description: 'Jacket short',
        descriptionFull: ['<p>Body</p>\n<ul><li><strong>Colour:</strong> black</li></ul>'],
        seoTitle: 'Jacket SEO',
        metaDescription: 'Jacket meta',
      },
      sk: expect.objectContaining({ title: 'Bunda' }),
      cs: expect.objectContaining({ title: 'Bunda CZ' }),
    });
    expect(warnings).toEqual([]);
    expect(suggestedCategories).toEqual([]);
  });

  it('never carries prices, stock or visibility, even if the model sends them', () => {
    const { draft } = mapDraft(
      answer({ translations: { en: lang('A', { salePrice: 1, stock: 'onStock' }), sk: lang('B'), cs: lang('C') } }),
      options,
    );
    expect(Object.keys(draft.en!).sort()).toEqual(['description', 'descriptionFull', 'metaDescription', 'seoTitle', 'title']);
  });

  it('rejects a missing language or wrong types', () => {
    expect(invalid(answer({ translations: { en: lang('A'), sk: lang('B') } }))).toMatch(/translations\.cs/);
    expect(invalid(answer({ translations: { en: lang('A', { title: 5 }), sk: lang('B'), cs: lang('C') } }))).toMatch(/translations\.en\.title/);
    expect(invalid(answer({ translations: { en: lang('A', { attributes: [{ name: 'x' }] }), sk: lang('B'), cs: lang('C') } }))).toMatch(/attributes/);
    expect(invalid(answer({ warnings: 'none' }))).toMatch(/warnings/);
    expect(invalid('just text')).toMatch(/not an object/);
    expect(invalid({ ...answer(), translations: undefined })).toMatch(/translations/);
  });

  it('drops categories that do not exist and says so', () => {
    const { draft, warnings } = mapDraft(answer({ categories: ['jackets', 'invented', 'jackets'] }), options);
    expect(draft.tags).toEqual(['jackets']);
    expect(warnings).toEqual(['Ignored categories that do not exist in the shop.']);
  });

  it('keeps only new suggested categories, without duplicates', () => {
    const { suggestedCategories } = mapDraft(answer({ suggestedCategories: ['Coats', 'Winter wear', 'Winter wear', 'Ski gear', 'Extra'] }), options);
    expect(suggestedCategories).toEqual(['Winter wear', 'Ski gear', 'Extra']);
  });

  it('builds a slug from the English title when the model gives none', () => {
    expect(mapDraft(answer({ titleUrl: '' }), options).draft.titleUrl).toBe('jacket');
    expect(mapDraft(answer({ titleUrl: 'Pánska Bunda!' }), options).draft.titleUrl).toBe('panska-bunda');
  });

  it('trims SEO texts to their limits and strips HTML from plain fields', () => {
    const long = 'word '.repeat(30); // over the SEO limits, within what validation accepts
    const { draft } = mapDraft(
      answer({ translations: { en: lang('<b>Jacket</b>', { seoTitle: long, metaDescription: long }), sk: lang('B'), cs: lang('C') } }),
      options,
    );
    expect(draft.en!.title).toBe('Jacket');
    expect(draft.en!.seoTitle.length).toBeLessThanOrEqual(60);
    expect(draft.en!.seoTitle.endsWith('…')).toBe(true);
    expect(draft.en!.metaDescription.length).toBeLessThanOrEqual(155);
  });

  it('keeps plain texts as real characters (Angular escapes them when rendering)', () => {
    const { draft } = mapDraft(answer({ translations: { en: lang('Rock & Roll <3 "tee"'), sk: lang('B'), cs: lang('C') } }), options);
    expect(draft.en!.title).toBe('Rock & Roll <3 "tee"');
  });

  it('works without images', () => {
    const { draft } = mapDraft(answer(), { ...options, imageUrls: [] });
    expect(draft.images).toEqual([]);
    expect(draft.mainImage).toEqual({ url: '', name: 'winter-jacket' });
  });
});

describe('renderDescription', () => {
  it('keeps only allow-listed tags and no attributes', () => {
    const html = renderDescription(
      '<p onclick="x()" style="color:red">Hi <a href="https://evil">link</a><img src=x onerror=alert(1)></p><script>alert(1)</script>',
      [],
    );
    expect(html).toBe('<p>Hi link</p>');
  });

  it('escapes attribute names and values', () => {
    expect(renderDescription('', [{ name: 'Size <b>', value: 'L & XL "wide"' }])).toBe(
      '<ul><li><strong>Size:</strong> L &amp; XL &quot;wide&quot;</li></ul>',
    );
  });

  it('skips empty attributes and caps the list', () => {
    const attributes = [{ name: '', value: 'x' }, ...Array.from({ length: 20 }, (_, i) => ({ name: `A${i}`, value: 'v' }))];
    expect(renderDescription('', attributes).match(/<li>/g)).toHaveLength(12);
  });
});

describe('slugify and truncate', () => {
  it('slugifies to lowercase ASCII with hyphens', () => {
    expect(slugify('  Čierna Bunda – XL / 2026 ')).toBe('cierna-bunda-xl-2026');
    expect(slugify('a'.repeat(100)).length).toBe(60);
  });

  it('truncates at a word boundary', () => {
    expect(truncate('short text', 60)).toBe('short text');
    expect(truncate('one two three four', 12)).toBe('one two…');
  });
});
