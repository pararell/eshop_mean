// Typed form model of the admin product editor: creation, loading a product, the save payload and
// applying an AI draft. Kept free of component state so the rules are easy to follow and test.
import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import type { AiProductDraft, LanguageCode, ProductInput, ProductRaw } from '@eshop/shared';

export const SEO_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 160;
/** Lowercase letters, digits and single hyphens/underscores between them */
export const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;

export type LangForm = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  descriptionFull: FormControl<string>;
  seoTitle: FormControl<string>;
  metaDescription: FormControl<string>;
  salePrice: FormControl<string>;
  regularPrice: FormControl<string>;
  onSale: FormControl<boolean>;
  stock: FormControl<string>;
  visibility: FormControl<boolean>;
  shipping: FormControl<string>;
}>;

export type ProductForm = FormGroup<{
  titleUrl: FormControl<string>;
  tags: FormControl<string[]>;
  images: FormControl<string[]>;
  mainImage: FormControl<string>;
  langs: FormGroup<Record<string, LangForm>>;
}>;

/** Fields the AI fills, per language */
export const AI_LANG_FIELDS = ['title', 'description', 'descriptionFull', 'seoTitle', 'metaDescription'] as const;

/** Required once the language is visible in the shop */
const requiredWhenVisible: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const visible = control.parent?.get('visibility')?.value === true;
  return visible && !String(control.value ?? '').trim() ? { requiredWhenVisible: true } : null;
};

const price: ValidatorFn = (control) => {
  const value = String(control.value ?? '').trim();
  return !value || PRICE_PATTERN.test(value) ? null : { price: true };
};

/** '19,90' → 19.9; empty → null */
const toPrice = (value: string): number | null => (value.trim() ? Number(value.trim().replace(',', '.')) : null);

/** On sale: the price customers pay must be below the regular (crossed-out) price; the API checks the same */
const saleBelowRegular: ValidatorFn = (control) => {
  const group = control.parent;
  if (group?.get('onSale')?.value !== true) return null;
  const sale = toPrice(String(control.value ?? ''));
  const regular = toPrice(String(group.get('regularPrice')?.value ?? ''));
  return sale !== null && regular !== null && sale >= regular ? { saleNotBelowRegular: true } : null;
};

const text = (value = '', validators: ValidatorFn[] = []) => new FormControl(value, { nonNullable: true, validators });

function createLangForm(): LangForm {
  const group: LangForm = new FormGroup({
    title: text('', [requiredWhenVisible, Validators.maxLength(120)]),
    description: text('', [Validators.maxLength(500)]),
    descriptionFull: text(),
    seoTitle: text('', [Validators.maxLength(SEO_TITLE_MAX)]),
    metaDescription: text('', [Validators.maxLength(META_DESCRIPTION_MAX)]),
    salePrice: text('', [requiredWhenVisible, price, saleBelowRegular]),
    regularPrice: text('', [price]),
    onSale: new FormControl(false, { nonNullable: true }),
    stock: text('onStock'),
    // New products start hidden in every language until the admin publishes them
    visibility: new FormControl(false, { nonNullable: true }),
    shipping: text('basic'),
  });
  // Title and price become required when the language is made visible
  group.controls.visibility.valueChanges.subscribe(() => {
    group.controls.title.updateValueAndValidity();
    group.controls.salePrice.updateValueAndValidity();
  });
  // The sale price is checked against the regular price while on sale
  const checkSalePrice = () => {
    group.controls.salePrice.updateValueAndValidity();
    group.controls.salePrice.markAsTouched();
  };
  group.controls.onSale.valueChanges.subscribe(checkSalePrice);
  group.controls.regularPrice.valueChanges.subscribe(checkSalePrice);
  return group;
}

export function createProductForm(languages: LanguageCode[], takenTitleUrls: () => string[]): ProductForm {
  const uniqueSlug: ValidatorFn = (control) => (takenTitleUrls().includes(control.value) ? { taken: true } : null);
  return new FormGroup({
    titleUrl: text('', [Validators.required, Validators.pattern(SLUG_PATTERN), uniqueSlug]),
    tags: new FormControl<string[]>([], { nonNullable: true }),
    images: new FormControl<string[]>([], { nonNullable: true }),
    mainImage: text(),
    langs: new FormGroup(Object.fromEntries(languages.map((lang) => [lang, createLangForm()])) as Record<string, LangForm>),
  });
}

const priceText = (value: number | null | undefined) => (value === null || value === undefined || Number.isNaN(value) ? '' : String(value));

/** Fills the form from a product as returned by `GET /api/products/:titleUrl` (all languages) */
export function loadProduct(form: ProductForm, product: ProductRaw, languages: LanguageCode[]): void {
  form.reset();
  form.setValue({
    titleUrl: product.titleUrl,
    tags: [...(product.tags ?? [])],
    images: [...(product.images ?? [])],
    mainImage: product.mainImage?.url ?? '',
    langs: Object.fromEntries(
      languages.map((lang) => {
        const info = product[lang];
        return [
          lang,
          {
            title: info?.title ?? '',
            description: info?.description ?? '',
            descriptionFull: info?.descriptionFull?.[0] ?? '',
            seoTitle: info?.seoTitle ?? '',
            metaDescription: info?.metaDescription ?? '',
            salePrice: priceText(info?.salePrice),
            regularPrice: priceText(info?.regularPrice),
            onSale: !!info?.onSale,
            stock: info?.stock || 'onStock',
            visibility: !!info?.visibility,
            shipping: info?.shipping || 'basic',
          },
        ];
      }),
    ),
  });
}

/** The body for `POST /api/products/add` and `PATCH /api/products/edit` */
export function toProductInput(form: ProductForm, languages: LanguageCode[]): ProductInput {
  const value = form.getRawValue();
  const mainImage = value.mainImage || value.images[0] || '';
  const input: Record<string, unknown> = {
    titleUrl: value.titleUrl,
    tags: value.tags,
    images: value.images,
    mainImage: { url: mainImage, name: value.titleUrl },
  };
  for (const lang of languages) {
    const l = value.langs[lang];
    input[lang] = {
      title: l.title.trim(),
      description: l.description.trim(),
      descriptionFull: l.descriptionFull.trim() ? [l.descriptionFull] : [],
      seoTitle: l.seoTitle.trim(),
      metaDescription: l.metaDescription.trim(),
      salePrice: toPrice(l.salePrice),
      regularPrice: toPrice(l.regularPrice),
      onSale: l.onSale,
      stock: l.stock,
      visibility: l.visibility,
      shipping: l.shipping,
    };
  }
  return input as unknown as ProductInput;
}

/** Path of a form control, e.g. `langs.sk.title`; used to mark AI-filled fields */
export const langPath = (lang: string, field: string) => `langs.${lang}.${field}`;

/**
 * Applies an AI draft. Empty fields are filled; fields that already have text are only replaced when
 * `overwrite` is set. Categories and images are merged. Returns the paths and values that were
 * filled, so the editor can mark them until the admin edits or accepts them.
 */
export function applyDraft(
  form: ProductForm,
  draft: AiProductDraft,
  options: { languages: LanguageCode[]; overwrite: boolean; titleUrlEditable: boolean },
): Map<string, string> {
  const filled = new Map<string, string>();
  const set = (path: string, value: string) => {
    const control = form.get(path) as FormControl<string> | null;
    if (!control || !value || control.value === value) return;
    if (control.value.trim() && !options.overwrite) return;
    control.setValue(value);
    control.markAsDirty();
    filled.set(path, value);
  };

  if (options.titleUrlEditable) set('titleUrl', draft.titleUrl);

  const tags = form.controls.tags;
  const newTags = draft.tags.filter((tag) => !tags.value.includes(tag));
  if (newTags.length) {
    tags.setValue([...tags.value, ...newTags]);
    tags.markAsDirty();
  }
  const images = form.controls.images;
  const newImages = draft.images.filter((image) => !images.value.includes(image));
  if (newImages.length) images.setValue([...images.value, ...newImages]);
  if (!form.controls.mainImage.value && draft.mainImage.url) form.controls.mainImage.setValue(draft.mainImage.url);

  for (const lang of options.languages) {
    const texts = draft[lang];
    if (!texts) continue;
    set(langPath(lang, 'title'), texts.title);
    set(langPath(lang, 'description'), texts.description);
    set(langPath(lang, 'descriptionFull'), texts.descriptionFull[0] ?? '');
    set(langPath(lang, 'seoTitle'), texts.seoTitle);
    set(langPath(lang, 'metaDescription'), texts.metaDescription);
  }
  return filled;
}

/** Category slug in the format the shop uses for tags (see the old editor's addTag) */
export const categorySlug = (name: string) => name.trim().replace(/\s+/g, '_').toLowerCase();

/** Slug suggestion from a title: ASCII, lowercase, hyphens */
export const slugFromTitle = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
