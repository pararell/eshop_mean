import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatChipRemove, MatChipRow, MatChipGrid, MatChipInput, MatChipInputEvent } from '@angular/material/chips';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';

import type { CategoryInput, LanguageCode } from '@eshop/shared';
import { languages } from '../../../shared/constants';
import { TRAIL_COLORS } from '../../../shared/trail';
import { CategoryRaw } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';
import { AdminItemListComponent, AdminListItem } from '../admin-ui/admin-item-list.component';

/**
 * Categories: the list on the left, the selected (or new) category's form on the right. Texts,
 * visibility and menu position are per language (tabs). Saving sends the same payload as before
 * (`PATCH /api/products/categories/edit`, an upsert by `titleUrl`).
 */
@Component({
  selector: 'app-categories-edit',
  templateUrl: './categories-edit.component.html',
  styleUrls: ['./categories-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatSelect,
    TitleCasePipe,
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatChipInput,
    MatRadioGroup,
    MatRadioButton,
    MatSlideToggle,
    MatTabGroup,
    MatTab,
    MatIcon,
    AdminPageHeaderComponent,
    AdminItemListComponent,
  ],
})
export class CategoriesEditComponent {
  private fb = inject(FormBuilder);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private dialog = inject(MatDialog);

  readonly languages = languages;
  readonly trailColors = TRAIL_COLORS;
  readonly lang = this.selectors.appLang;
  readonly categories = this.selectors.allCategories;
  /** titleUrl of the category in the form; '' for a new one; null when nothing is open */
  readonly selected = signal<string | null>(null);
  readonly subCategoryQuery = signal('');

  readonly form: FormGroup = this.fb.group({
    titleUrl: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    mainImage: '',
    mainImageCover: false,
    /** Wide photo for the category page header; '' = the image above */
    headerImage: ['', Validators.pattern(/^https:\/\/\S+$/)],
    /** '' = by position */
    trailColor: '',
    subCategories: [[] as string[]],
    ...Object.fromEntries(
      languages.map((lang) => [lang, this.fb.group({ title: '', description: '', position: 0, visibility: false, menuHidden: false })]),
    ),
  });
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  readonly listItems = computed<AdminListItem[]>(() =>
    this.categories()
      .map(({ category, productsWithCategory }) => ({
        id: category.titleUrl,
        label: this.titleOf(category),
        meta: `${productsWithCategory.length} ${productsWithCategory.length === 1 ? 'product' : 'products'}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  readonly current = computed(() => this.categories().find(({ category }) => category.titleUrl === this.selected()));
  readonly products = computed(() => this.current()?.productsWithCategory ?? []);
  readonly subCategoryOptions = computed(() => {
    const query = this.subCategoryQuery().toLowerCase();
    const taken = new Set<string>([...(this.formValue().subCategories ?? []), this.formValue().titleUrl]);
    return this.categories()
      .map(({ category }) => category.titleUrl)
      .filter((titleUrl) => !taken.has(titleUrl) && titleUrl.includes(query));
  });

  constructor() {
    this.store.getAllCategories();
  }

  /** The category's title in the admin language, or its URL */
  titleOf(category: CategoryRaw): string {
    return category[this.lang() as LanguageCode]?.title || category.en?.title || category.titleUrl;
  }

  async select(titleUrl: string | ''): Promise<void> {
    if (this.selected() === titleUrl) return;
    if (this.form.dirty && !(await this.confirmDiscard())) return;
    const found = this.categories().find(({ category }) => category.titleUrl === titleUrl)?.category;
    this.form.reset({
      titleUrl: found?.titleUrl ?? '',
      mainImage: found?.mainImage?.url ?? '',
      mainImageCover: !!found?.mainImage?.type,
      headerImage: found?.headerImage ?? '',
      trailColor: found?.trailColor ?? '',
      subCategories: found?.subCategories ?? [],
      ...Object.fromEntries(
        languages.map((lang) => {
          const texts: Partial<NonNullable<CategoryRaw['en']>> = found?.[lang] ?? {};
          return [
            lang,
            {
              title: texts.title ?? '',
              description: texts.description ?? '',
              position: texts.position ?? 0,
              visibility: !!texts.visibility,
              menuHidden: !!texts.menuHidden,
            },
          ];
        }),
      ),
    });
    // The URL identifies a category: it can be set only when creating one
    if (found) this.form.get('titleUrl')!.disable();
    else this.form.get('titleUrl')!.enable();
    this.selected.set(titleUrl);
  }

  addSubCategory(event: MatChipInputEvent | { value: string }): void {
    const value = (event.value ?? '').trim().replace(/ /g, '_').toLowerCase();
    const list: string[] = this.form.get('subCategories')!.value;
    if (value && value !== this.form.getRawValue().titleUrl && !list.includes(value)) {
      this.form.get('subCategories')!.setValue([...list, value]);
      this.form.markAsDirty();
    }
    if ('chipInput' in event) event.chipInput.clear();
    this.subCategoryQuery.set('');
  }

  removeSubCategory(value: string): void {
    this.form.get('subCategories')!.setValue((this.form.get('subCategories')!.value as string[]).filter((sub) => sub !== value));
    this.form.markAsDirty();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { mainImageCover, ...value } = this.form.getRawValue();
    const payload = { ...value, mainImage: { url: value.mainImage, name: value.titleUrl, type: mainImageCover } } as CategoryInput;
    this.store.editCategory(payload);
    this.form.markAsPristine();
    this.selected.set(value.titleUrl);
    this.form.get('titleUrl')!.disable();
  }

  async remove(): Promise<void> {
    const titleUrl = this.form.getRawValue().titleUrl as string;
    const confirmed = await confirmAction(this.dialog, {
      title: 'Delete category?',
      message: `"${titleUrl}" is removed from every product that has it. This can't be undone.`,
      confirm: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.store.removeCategory(titleUrl);
    this.form.markAsPristine();
    this.selected.set(null);
  }

  private confirmDiscard(): Promise<boolean> {
    return confirmAction(this.dialog, {
      title: 'Discard changes?',
      message: 'The open category has unsaved changes.',
      confirm: 'Discard',
      danger: true,
    });
  }
}
