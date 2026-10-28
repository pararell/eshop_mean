import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ReactiveFormsModule } from '@angular/forms';
import type { HomeSectionType } from '@eshop/shared';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';

import { ApiService } from '../../../../services/api.service';
import { languages } from '../../../../shared/constants';
import { MAX_HOME_SECTIONS, newBand } from '../../../../shared/home-layout';
import { ACCEPTED, MAX_FILE_BYTES } from '../../product-editor/image-gallery/image-gallery.component';
import { moveSection, sectionGroup, SectionGroup, SectionsArray, sectionsFromArray } from '../home-sections-form';

const SECTION_INFO: Record<HomeSectionType, { label: string; hint: string }> = {
  hero: { label: 'Hero', hint: 'The full-screen photo or video (settings above); always first' },
  benefits: { label: 'Benefits', hint: 'Shipping, returns and payment notes' },
  categories: { label: 'Categories', hint: 'The category tiles' },
  products: { label: 'Products', hint: 'The product list' },
  band: { label: 'Photo band', hint: '' },
};

/**
 * The home page sections of a theme: order (drag or the arrow buttons; the hero stays first), on/off,
 * and photo bands (add, edit per language, remove). Works on the theme form's `home` FormArray, so
 * changes preview live and are saved with the theme.
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
    MatTabGroup,
    MatTab,
    MatTabLabel,
  ],
})
export class HomeSectionsEditorComponent {
  private api = inject(ApiService);

  readonly sections = input.required<SectionsArray>();

  readonly languages = languages;
  readonly maxSections = MAX_HOME_SECTIONS;
  /** id of the band whose settings are open */
  readonly expanded = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  /** Announced to screen readers */
  readonly status = signal('');
  /** Nothing can be dropped above the hero */
  readonly canSortTo = (index: number) => index > 0;

  info(group: SectionGroup): { label: string; hint: string } {
    return SECTION_INFO[group.controls.type.value];
  }

  /** A band is named by its first title */
  label(group: SectionGroup): string {
    if (group.controls.type.value !== 'band') return this.info(group).label;
    const title = languages.map((lang) => group.controls.text.controls[lang].controls.title.value.trim()).find(Boolean);
    return title ? `Photo band: ${title}` : 'Photo band (no title yet)';
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

  toggleBand(group: SectionGroup): void {
    const id = group.controls.id.value;
    this.expanded.set(this.expanded() === id ? null : id);
    this.uploadError.set('');
  }

  addBand(): void {
    const array = this.sections();
    if (array.length >= MAX_HOME_SECTIONS) return;
    const band = newBand(sectionsFromArray(array));
    array.push(sectionGroup(band));
    array.markAsDirty();
    this.expanded.set(band.id);
    this.status.set('Photo band added at the end.');
  }

  removeBand(index: number): void {
    const array = this.sections();
    array.removeAt(index);
    array.markAsDirty();
    this.status.set('Photo band removed.');
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
