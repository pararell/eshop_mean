import { buildThemeSchema, mapThemeDraft } from './theme-draft';
import { LlmError } from './providers/llm-provider';

describe('theme drafts', () => {
  const texts = { title: 'Autumn on the ridge', text: 'Warm layers.', button: 'Shop now' };
  const answer = { primaryColor: '#15803D', heroTint: 'none', shopName: 'Trail', band: { en: texts, sk: texts } };

  it('asks for every language in the given order', () => {
    const schema = buildThemeSchema(['sk', 'en']) as { properties: { band: { required: string[] } } };
    expect(schema.properties.band.required).toEqual(['sk', 'en']);
  });

  it('keeps plain texts within their limits', () => {
    const draft = mapThemeDraft(
      { ...answer, shopName: '<b>Trail</b>  shop', band: { en: { title: 'x'.repeat(200), text: '<script>x</script> Warm', button: 7 } } },
      ['en'],
    );
    expect(draft.primaryColor).toBe('#15803d');
    expect(draft.shopName).toBe('Trail shop');
    expect(draft.band.en!.title.length).toBeLessThanOrEqual(120);
    expect(draft.band.en!.text).toBe('x Warm');
    expect(draft.band.en!.button).toBe('');
  });

  it('rejects a structurally wrong answer', () => {
    const rejects = (json: unknown) => expect(() => mapThemeDraft(json, ['en', 'sk'])).toThrow(LlmError);
    rejects(null);
    rejects({ ...answer, primaryColor: 'rgb(0,0,0)' });
    rejects({ ...answer, heroTint: 'cold' });
    rejects({ ...answer, band: { en: texts } });
    rejects({ ...answer, band: { en: texts, sk: { ...texts, title: ' ' } } });
  });
});
