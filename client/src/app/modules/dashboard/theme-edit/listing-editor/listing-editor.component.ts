import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';

import { ApiService } from '../../../../services/api.service';
import { languages } from '../../../../shared/constants';
import { ALL_PRODUCTS_PAGE, MAX_LISTING_TILES, TILE_EVERY_RANGE } from '../../../../shared/listing';
import { SignalStore } from '../../../../store/signal.store';
import { SignalStoreSelectors } from '../../../../store/signal.store.selectors';
import { featuredGroup, ListingGroup, newFeatured, newTile, TileGroup, tileGroup } from '../listing-form';
import { uploadPhoto } from '../upload-photo';

/**
 * The product listing pages of a theme: the All products header (photo and texts), editorial tiles in
 * the product grid (photo, texts, link, pages; a tile after every N products) and a featured product
 * per page. Works on the theme form's `listing` group, so changes preview live and are saved with the
 * theme. A category page header is set in the category itself (Categories).
 */
@Component({
  selector: 'app-listing-editor',
  templateUrl: './listing-editor.component.html',
  styleUrls: ['./listing-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    UpperCasePipe,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatSuffix,
    MatInput,
    MatSelect,
    MatOption,
    MatTabGroup,
    MatTab,
    MatTabLabel,
  ],
})
export class ListingEditorComponent {
  private api = inject(ApiService);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);

  readonly listing = input.required<ListingGroup>();

  readonly languages = languages;
  readonly maxTiles = MAX_LISTING_TILES;
  readonly tileEveryRange = TILE_EVERY_RANGE;
  /** The listing pages: All products and every category */
  readonly pageOptions = computed(() => [
    { key: ALL_PRODUCTS_PAGE, label: 'All products' },
    ...this.selectors
      .allCategories()
      .map(({ category }) => ({ key: category.titleUrl, label: category.en?.title || category.titleUrl }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ]);
  readonly productOptions = computed(() =>
    (this.selectors.allProducts() ?? [])
      .map((product) => ({ key: product.titleUrl, label: product.title || product.titleUrl }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );
  /** id of the tile whose settings are open */
  readonly expanded = signal<string | null>(null);
  /** 'header' or a tile id while its photo uploads */
  readonly uploading = signal<string | null>(null);
  readonly uploadError = signal<{ target: string; message: string } | null>(null);
  /** Announced to screen readers */
  readonly status = signal('');

  constructor() {
    if (!this.selectors.allCategories().length) this.store.getAllCategories();
    if (!this.selectors.allProducts()?.length) this.store.getAllProducts();
  }

  get tiles(): FormArray<TileGroup> {
    return this.listing().controls.tiles;
  }

  pageLabel(key: string): string {
    return this.pageOptions().find((option) => option.key === key)?.label ?? key;
  }

  /** A tile is named by its first title */
  tileLabel(group: TileGroup): string {
    const title = languages.map((lang) => group.controls.text.controls[lang].controls.title.value.trim()).find(Boolean);
    return title ? `Tile: ${title}` : 'Tile (no title yet)';
  }

  tilePages(group: TileGroup): string {
    const pages = group.controls.pages.value;
    return pages.length ? pages.map((key) => this.pageLabel(key)).join(', ') : 'Every product page';
  }

  toggleTile(group: TileGroup): void {
    const id = group.controls.id.value;
    this.expanded.set(this.expanded() === id ? null : id);
    this.uploadError.set(null);
  }

  addTile(): void {
    if (this.tiles.length >= MAX_LISTING_TILES) return;
    const tile = newTile(this.tiles.getRawValue());
    this.tiles.push(tileGroup(tile));
    this.tiles.markAsDirty();
    this.expanded.set(tile.id);
    this.status.set('Tile added at the end.');
  }

  moveTile(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.tiles.length) return;
    const group = this.tiles.at(index);
    this.tiles.removeAt(index, { emitEvent: false });
    this.tiles.insert(target, group);
    this.tiles.markAsDirty();
    this.status.set(`${this.tileLabel(group)} moved to position ${target + 1}.`);
  }

  removeTile(index: number): void {
    const label = this.tileLabel(this.tiles.at(index));
    this.tiles.removeAt(index);
    this.tiles.markAsDirty();
    this.status.set(`${label} removed.`);
  }

  addFeatured(): void {
    const featured = this.listing().controls.featured;
    const row = newFeatured(
      featured.getRawValue(),
      this.pageOptions()
        .map((option) => option.key)
        .filter((key) => key !== ALL_PRODUCTS_PAGE),
    );
    featured.push(featuredGroup(row));
    featured.markAsDirty();
    this.status.set(`Featured product added for ${this.pageLabel(row.page)}.`);
  }

  removeFeatured(index: number): void {
    const featured = this.listing().controls.featured;
    const page = this.pageLabel(featured.at(index).controls.page.value);
    featured.removeAt(index);
    featured.markAsDirty();
    this.status.set(`Featured product of ${page} removed.`);
  }

  /** Uploads the header photo ('header') or a tile's photo to the image library */
  async upload(target: string, control: FormControl<string>, event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    this.uploadError.set(null);
    this.uploading.set(target);
    this.status.set('Uploading the photo…');
    const result = await uploadPhoto(this.api, file);
    this.uploading.set(null);
    if ('error' in result) {
      this.uploadError.set({ target, message: result.error });
      this.status.set('');
      return;
    }
    control.setValue(result.url);
    control.markAsDirty();
    this.status.set('Photo uploaded.');
  }
}
