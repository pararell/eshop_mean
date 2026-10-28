import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ReactiveFormsModule } from '@angular/forms';
import type { HomeSection, HomeSectionType } from '@eshop/shared';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { languages } from '../../../../shared/constants';
import { MAX_HOME_SECTIONS, newBand, newProductRow, newTrips } from '../../../../shared/home-layout';
import { SignalStore } from '../../../../store/signal.store';
import { SignalStoreSelectors } from '../../../../store/signal.store.selectors';
import { ACCEPTED, MAX_FILE_BYTES } from '../../product-editor/image-gallery/image-gallery.component';
import { moveSection, sectionGroup, SectionGroup, SectionsArray, sectionsFromArray, TRIP_SLOTS } from '../home-sections-form';

const SECTION_INFO: Record<HomeSectionType, { label: string; hint: string }> = {
  hero: { label: 'Hero', hint: 'The full-screen photo or video (settings above); always first' },
  benefits: { label: 'Benefits', hint: 'Shipping, returns and payment notes' },
  categories: { label: 'Categories', hint: 'The category tiles' },
  products: { label: 'Products', hint: 'The product list' },
  band: { label: 'Photo band', hint: 'Shown in the languages that have a title' },
  trips: { label: 'Shop by trip', hint: 'Up to three large category cards' },
  productRow: { label: 'Product row', hint: 'Four products: the newest, on sale or from a category' },
};

/** Types with their own settings (the others only move, switch and get ridges) */
const EDITABLE: HomeSectionType[] = ['band', 'trips', 'productRow'];
/** The texts each editable type has per language */
const TEXT_FIELDS: Partial<Record<HomeSectionType, ('title' | 'text' | 'button')[]>> = {
  band: ['title', 'text', 'button'],
  trips: ['title'],
  productRow: ['title'],
};

/**
 * The home page sections of a theme: order (drag or the arrow buttons; the hero stays first), on/off,
 * ridges under a section, and the repeatable sections (photo bands, shop by trip, product rows: add,
 * edit per language, remove). Works on the theme form's `home` FormArray, so changes preview live and
 * are saved with the theme.
 */
@Component({
  selector: 'app-home-sections-editor',
  templateUrl: './home-sections-editor.component.html',
  styleUrls: ['./home-sections-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    UpperCasePipe,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSlideToggle,
    MatSelect,
    MatOption,
    MatTabGroup,
    MatTab,
    MatTabLabel,
  ],
})
export class HomeSectionsEditorComponent {
  private api = inject(ApiService);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);

  readonly sections = input.required<SectionsArray>();

  readonly languages = languages;
  readonly maxSections = MAX_HOME_SECTIONS;
  readonly tripSlots = Array.from({ length: TRIP_SLOTS }, (_, i) => i);
  /** Every category, menu-hidden ones included (trips are usually menu-hidden categories) */
  readonly categoryOptions = computed(() =>
    this.selectors
      .allCategories()
      .map(({ category }) => ({
        slug: category.titleUrl,
        label: category.en?.title || category.titleUrl,
        hidden: !!category.en?.menuHidden,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );
  /** id of the section whose settings are open */
  readonly expanded = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  /** Announced to screen readers */
  readonly status = signal('');
  /** Nothing can be dropped above the hero */
  readonly canSortTo = (index: number) => index > 0;

  constructor() {
    if (!this.selectors.allCategories().length) this.store.getAllCategories();
  }

  info(group: SectionGroup): { label: string; hint: string } {
    return SECTION_INFO[group.controls.type.value];
  }

  editable(group: SectionGroup): boolean {
    return EDITABLE.includes(group.controls.type.value);
  }

  textFields(group: SectionGroup): ('title' | 'text' | 'button')[] {
    return TEXT_FIELDS[group.controls.type.value] ?? [];
  }

  /** A repeatable section is named by its first title */
  label(group: SectionGroup): string {
    const name = this.info(group).label;
    if (!this.editable(group)) return name;
    const title = languages.map((lang) => group.controls.text.controls[lang].controls.title.value.trim()).find(Boolean);
    if (title) return `${name}: ${title}`;
    return group.controls.type.value === 'band' ? `${name} (no title yet)` : name;
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 1 || target >= this.sections().length) return;
    moveSection(this.sections(), index, target);
    this.status.set(`${this.label(this.sections().at(target))} moved to position ${target + 1}.`);
  }

  dropped(event: CdkDragDrop<unknown>): void {
    moveSection(this.sections(), event.previousIndex, Math.max(1, event.currentIndex));
  }

  toggleRidge(group: SectionGroup): void {
    const ridge = group.controls.ridge;
    ridge.setValue(!ridge.value);
    ridge.markAsDirty();
    this.status.set(`Ridges under ${this.label(group)} ${ridge.value ? 'on' : 'off'}.`);
  }

  toggleSettings(group: SectionGroup): void {
    const id = group.controls.id.value;
    this.expanded.set(this.expanded() === id ? null : id);
    this.uploadError.set('');
  }

  add(type: 'band' | 'trips' | 'productRow'): void {
    const array = this.sections();
    if (array.length >= MAX_HOME_SECTIONS) return;
    const existing = sectionsFromArray(array);
    const section: HomeSection = type === 'band' ? newBand(existing) : type === 'trips' ? newTrips(existing) : newProductRow(existing);
    array.push(sectionGroup(section));
    array.markAsDirty();
    this.expanded.set(section.id);
    this.status.set(`${SECTION_INFO[type].label} added at the end.`);
  }

  remove(index: number): void {
    const array = this.sections();
    const label = this.label(array.at(index));
    array.removeAt(index);
    array.markAsDirty();
    this.status.set(`${label} removed.`);
  }

  /** Uploads the band photo to Cloudinary; the upload endpoint answers with the image library, newest last */
  async upload(group: SectionGroup, event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return this.uploadError.set('Only JPEG, PNG, WebP or GIF images.');
    if (file.size > MAX_FILE_BYTES) return this.uploadError.set('The photo is larger than 10 MB.');

    this.uploadError.set('');
    this.uploading.set(true);
    this.status.set('Uploading the photo…');
    const request = this.api.uploadImage({ fileToUpload: file });
    const result = request ? await firstValueFrom(request) : undefined;
    const all = (result as { all?: string[] } | undefined)?.all;
    const url = all?.[all.length - 1];
    this.uploading.set(false);
    if (!result || result.error || !url) {
      this.uploadError.set('Upload failed. Try again.');
      this.status.set('');
      return;
    }
    group.controls.image.setValue(url);
    group.controls.image.markAsDirty();
    this.status.set('Photo uploaded.');
  }
}
