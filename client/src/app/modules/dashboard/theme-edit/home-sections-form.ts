// The home page sections (ThemeStyles.home) as a FormArray in the theme form: one group per section,
// in page order. Every group has every setting; each type saves only its own (sectionsFromArray).
import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import type { HomeSection, HomeSectionType, LanguageCode, ProductRowSource } from '@eshop/shared';

import { languages } from '../../../shared/constants';

// The same rules as the server (server/src/eshop/theme-styles.ts); empty is always allowed
export const httpsUrl = Validators.pattern(/^(https:\/\/\S+)?$/);
export const shopPathOrHttps = Validators.pattern(/^((\/(?!\/)\S*)|(https:\/\/\S+))?$/);

/** Cards of a trips section */
export const TRIP_SLOTS = 3;

export type SectionTextGroup = FormGroup<{ title: FormControl<string>; text: FormControl<string>; button: FormControl<string> }>;
export type SectionGroup = FormGroup<{
  id: FormControl<string>;
  type: FormControl<HomeSectionType>;
  enabled: FormControl<boolean>;
  /** Ridges under the section */
  ridge: FormControl<boolean>;
  // band
  image: FormControl<string>;
  link: FormControl<string>;
  width: FormControl<'boxed' | 'full'>;
  // trips: one category per card ('' = no card)
  categories: FormArray<FormControl<string>>;
  // productRow
  source: FormControl<ProductRowSource>;
  category: FormControl<string>;
  text: FormGroup<Record<LanguageCode, SectionTextGroup>>;
}>;
export type SectionsArray = FormArray<SectionGroup>;

const text = (value: string | undefined, max: number) => new FormControl(value ?? '', { nonNullable: true, validators: [Validators.maxLength(max)] });

/** What a type needs besides the field rules: trips need a category, a category row its category */
function sectionRules(control: AbstractControl): ValidationErrors | null {
  const group = control as SectionGroup;
  const type = group.controls.type.value;
  if (type === 'trips') {
    const chosen = group.controls.categories.value.filter(Boolean);
    if (!chosen.length) return { tripsEmpty: true };
    if (new Set(chosen).size !== chosen.length) return { tripsTwice: true };
  }
  if (type === 'productRow' && group.controls.source.value === 'category' && !group.controls.category.value) return { categoryMissing: true };
  return null;
}

export function sectionGroup(section: HomeSection): SectionGroup {
  const band = section.type === 'band' ? section : null;
  const trips = section.type === 'trips' ? section : null;
  const row = section.type === 'productRow' ? section : null;
  const texts = band?.text ?? trips?.text ?? row?.text;
  return new FormGroup(
    {
      id: new FormControl(section.id, { nonNullable: true }),
      type: new FormControl<HomeSectionType>(section.type, { nonNullable: true }),
      enabled: new FormControl(section.enabled, { nonNullable: true }),
      ridge: new FormControl(section.divider === 'ridge', { nonNullable: true }),
      image: new FormControl(band?.image ?? '', { nonNullable: true, validators: [httpsUrl] }),
      link: new FormControl(band?.link ?? '', { nonNullable: true, validators: [shopPathOrHttps] }),
      width: new FormControl<'boxed' | 'full'>(band?.width ?? 'boxed', { nonNullable: true }),
      categories: new FormArray(Array.from({ length: TRIP_SLOTS }, (_, i) => new FormControl(trips?.categories[i] ?? '', { nonNullable: true }))),
      source: new FormControl<ProductRowSource>(row?.source ?? 'newest', { nonNullable: true }),
      category: new FormControl(row?.category ?? '', { nonNullable: true }),
      text: new FormGroup(
        Object.fromEntries(
          languages.map((lang) => {
            const value = texts?.[lang] as { title?: string; text?: string; button?: string } | undefined;
            return [lang, new FormGroup({ title: text(value?.title, 120), text: text(value?.text, 300), button: text(value?.button, 40) })];
          }),
        ) as Record<LanguageCode, SectionTextGroup>,
      ),
    },
    { validators: sectionRules },
  );
}

export function sectionsArray(sections: readonly HomeSection[]): SectionsArray {
  return new FormArray(sections.map(sectionGroup));
}

/** The sections as saved: each type with its own settings, texts trimmed */
export function sectionsFromArray(array: SectionsArray): HomeSection[] {
  return array.getRawValue().map((value): HomeSection => {
    const { id, type, enabled } = value;
    const base = { id, enabled, ...(value.ridge ? { divider: 'ridge' as const } : {}) };
    const texts = <K extends 'title' | 'text' | 'button'>(fields: K[]) =>
      Object.fromEntries(
        languages.map((lang) => [lang, Object.fromEntries(fields.map((field) => [field, value.text[lang][field].trim()]))]),
      ) as Partial<Record<LanguageCode, Record<K, string>>>;
    switch (type) {
      case 'band':
        return { ...base, type, image: value.image.trim(), link: value.link.trim(), width: value.width, text: texts(['title', 'text', 'button']) };
      case 'trips':
        return { ...base, type, categories: value.categories.filter(Boolean), text: texts(['title']) };
      case 'productRow':
        return {
          ...base,
          type,
          source: value.source,
          ...(value.source === 'category' ? { category: value.category } : {}),
          text: texts(['title']),
        };
      default:
        return { ...base, type };
    }
  });
}

/** Moves a section and marks the form changed (the page preview follows) */
export function moveSection(array: SectionsArray, from: number, to: number): void {
  if (from === to) return;
  const group = array.at(from);
  array.removeAt(from, { emitEvent: false });
  array.insert(to, group);
  array.markAsDirty();
}
