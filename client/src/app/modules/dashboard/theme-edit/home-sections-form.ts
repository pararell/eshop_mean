// The home page sections (ThemeStyles.home) as a FormArray in the theme form: one group per section,
// in page order. Only bands use image, link and text.
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import type { HomeSection, HomeSectionType, LanguageCode } from '@eshop/shared';

import { languages } from '../../../shared/constants';

// The same rules as the server (server/src/eshop/theme-styles.ts); empty is always allowed
export const httpsUrl = Validators.pattern(/^(https:\/\/\S+)?$/);
export const shopPathOrHttps = Validators.pattern(/^((\/(?!\/)\S*)|(https:\/\/\S+))?$/);

export type BandTextGroup = FormGroup<{ title: FormControl<string>; text: FormControl<string> }>;
export type SectionGroup = FormGroup<{
  id: FormControl<string>;
  type: FormControl<HomeSectionType>;
  enabled: FormControl<boolean>;
  image: FormControl<string>;
  link: FormControl<string>;
  text: FormGroup<Record<LanguageCode, BandTextGroup>>;
}>;
export type SectionsArray = FormArray<SectionGroup>;

const text = (value: string, max: number) => new FormControl(value, { nonNullable: true, validators: [Validators.maxLength(max)] });

export function sectionGroup(section: HomeSection): SectionGroup {
  const band = section.type === 'band' ? section : null;
  return new FormGroup({
    id: new FormControl(section.id, { nonNullable: true }),
    type: new FormControl<HomeSectionType>(section.type, { nonNullable: true }),
    enabled: new FormControl(section.enabled, { nonNullable: true }),
    image: new FormControl(band?.image ?? '', { nonNullable: true, validators: [httpsUrl] }),
    link: new FormControl(band?.link ?? '', { nonNullable: true, validators: [shopPathOrHttps] }),
    text: new FormGroup(
      Object.fromEntries(
        languages.map((lang) => [
          lang,
          new FormGroup({ title: text(band?.text[lang]?.title ?? '', 120), text: text(band?.text[lang]?.text ?? '', 300) }),
        ]),
      ) as Record<LanguageCode, BandTextGroup>,
    ),
  });
}

export function sectionsArray(sections: readonly HomeSection[]): SectionsArray {
  return new FormArray(sections.map(sectionGroup));
}

/** The sections as saved (band texts trimmed) */
export function sectionsFromArray(array: SectionsArray): HomeSection[] {
  return array.getRawValue().map(({ id, type, enabled, image, link, text }): HomeSection => {
    if (type !== 'band') return { id, type, enabled };
    return {
      id,
      type,
      enabled,
      image: image.trim(),
      link: link.trim(),
      text: Object.fromEntries(languages.map((lang) => [lang, { title: text[lang].title.trim(), text: text[lang].text.trim() }])),
    };
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
