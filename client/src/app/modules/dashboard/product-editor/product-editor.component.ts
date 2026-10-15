import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { UpperCasePipe } from '@angular/common';
import { MatAutocomplete, MatAutocompleteSelectedEvent, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChipGrid, MatChipInput, MatChipRemove, MatChipRow } from '@angular/material/chips';
import { MatError, MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { Subscription, firstValueFrom } from 'rxjs';
import type { AiStatus, LanguageCode, ProductRaw } from '@eshop/shared';

import { ApiService } from '../../../services/api.service';
import { languages } from '../../../shared/constants';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { TinyEditorComponent } from '../tiny-editor.ts/tiny-editor.component';
import { AiAssistantComponent, AiFillRequest } from './ai-assistant/ai-assistant.component';
import { ImageGalleryComponent } from './image-gallery/image-gallery.component';
import {
  AI_LANG_FIELDS,
  applyDraft,
  categorySlug,
  createProductForm,
  langPath,
  loadProduct,
  META_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  slugFromTitle,
  toProductInput,
} from './product-form';

/** How many leading photos are sent to the AI (server limit) */
const AI_MAX_IMAGES = 3;
const LANGUAGE_LABELS: Record<string, string> = { en: 'English', sk: 'Slovak', cs: 'Czech' };

const errorMessage = (error: unknown, fallback: string): string => {
  const body = (error as HttpErrorResponse)?.error as { message?: string | string[] } | undefined;
  const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
  return message || fallback;
};

/**
 * Admin product editor (`/:lang/dashboard/products/new` and `/products/:titleUrl`). Nothing is saved
 * until the admin presses Save; AI-filled fields stay marked until they are edited or accepted.
 */
@Component({
  selector: 'app-product-editor',
  templateUrl: './product-editor.component.html',
  styleUrls: ['./product-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatButton,
    MatIconButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatCheckbox,
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatChipInput,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatSuffix,
    MatIcon,
    MatInput,
    MatProgressSpinner,
    MatSelect,
    MatSlideToggle,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    TinyEditorComponent,
    AiAssistantComponent,
    ImageGalleryComponent,
    UpperCasePipe,
  ],
})
export class ProductEditorComponent implements OnInit {
  private api = inject(ApiService);
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  private route = inject(ActivatedRoute);

  /** Route parameter; absent for a new product */
  readonly titleUrl = signal<string | undefined>(this.route.snapshot.paramMap.get('titleUrl') ?? undefined);

  readonly languages = languages as LanguageCode[];
  readonly languageLabels = LANGUAGE_LABELS;
  readonly seoTitleMax = SEO_TITLE_MAX;
  readonly metaDescriptionMax = META_DESCRIPTION_MAX;
  readonly aiFields = AI_LANG_FIELDS;

  readonly lang = this.selectors.appLang;
  readonly isNew = computed(() => !this.titleUrl());
  readonly listLink = computed(() => `/${this.lang()}/dashboard`);

  /** The store holds the raw response, which is an `{ error }` object when loading failed */
  private readonly allProducts = computed(() => {
    const list = this.selectors.allProducts();
    return Array.isArray(list) ? list : [];
  });
  private readonly takenTitleUrls = computed(() =>
    this.allProducts()
      .map((p) => p.titleUrl)
      .filter((t) => t !== this.titleUrl()),
  );
  readonly form = createProductForm(this.languages, () => this.takenTitleUrls());

  /** Bumped on every form event so OnPush computed state follows the form */
  private readonly formTick = toSignal(this.form.events, { initialValue: null });
  readonly formValue = computed(() => (this.formTick(), this.form.getRawValue()));

  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly confirmUnreviewed = signal(false);
  readonly uploading = signal(false);
  readonly selectedTab = signal(0);
  readonly htmlMode = signal<Record<string, boolean>>({});
  private saved = false;

  readonly categoryOptions = signal<string[]>([]);
  readonly categoryQuery = signal('');
  readonly filteredCategories = computed(() => {
    const query = this.categoryQuery().toLowerCase();
    const selected = this.formValue().tags;
    return this.categoryOptions().filter((c) => !selected.includes(c) && c.toLowerCase().includes(query));
  });

  // AI ---------------------------------------------------------------------------------------------
  readonly aiStatus = signal<AiStatus>({ enabled: false });
  readonly aiBusy = signal(false);
  readonly aiError = signal('');
  readonly aiWarnings = signal<string[]>([]);
  readonly aiSuggestions = signal<string[]>([]);
  /** AI-filled control paths → the value the AI wrote */
  readonly aiMarks = signal(new Map<string, string>());
  private aiRequest?: Subscription;
  private slugEditedByUser = false;
  /** The AI's slug is already unique on the server; don't derive one from its title meanwhile */
  private applyingDraft = false;

  readonly aiImages = computed(() =>
    this.formValue()
      .images.filter((url) => url.includes('/image/upload/'))
      .slice(0, AI_MAX_IMAGES),
  );
  readonly aiPendingCount = computed(() => this.aiMarks().size);

  readonly aiAssistant = viewChild(AiAssistantComponent);
  readonly formEl = viewChild.required<ElementRef<HTMLFormElement>>('formEl');

  /** Per-language tab status: AI fields to review, errors, visible */
  readonly langStatus = computed(() => {
    this.formTick();
    const marks = this.aiMarks();
    return Object.fromEntries(
      this.languages.map((lang) => {
        const group = this.form.controls.langs.controls[lang];
        const ai = [...marks.keys()].filter((path) => path.startsWith(`langs.${lang}.`)).length;
        return [lang, { ai, invalid: group.invalid, visible: group.controls.visibility.value, empty: !group.controls.title.value.trim() }];
      }),
    ) as Record<string, { ai: number; invalid: boolean; visible: boolean; empty: boolean }>;
  });

  ngOnInit(): void {
    if (!this.allProducts().length) this.store.getAllProducts();

    this.api.getAiStatus().subscribe((status) => {
      if (!status.error) this.aiStatus.set(status);
    });
    this.api.getAllCategories().subscribe((response) => {
      if (!response.error && Array.isArray(response)) {
        this.categoryOptions.set(response.map((c) => c.category.titleUrl).sort());
      }
    });

    // AI marks disappear as soon as the admin changes the field
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.pruneAiMarks());

    // New products: the slug follows the English title until the admin edits it
    this.form.controls.langs.controls[this.languages[0]].controls.title.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((title) => {
      if (this.isNew() && !this.slugEditedByUser && !this.applyingDraft) {
        this.form.controls.titleUrl.setValue(slugFromTitle(title));
      }
    });

    const titleUrl = this.titleUrl();
    if (titleUrl) {
      this.form.controls.titleUrl.disable();
      this.load(titleUrl);
    }
  }

  private load(titleUrl: string): void {
    this.loading.set(true);
    this.api.getProduct(titleUrl).subscribe((response) => {
      this.loading.set(false);
      // Without `lang` the API returns the raw product with every language
      const product = response as unknown as ProductRaw & { error?: unknown };
      if (product.error || !product.titleUrl) {
        this.notFound.set(true);
        return;
      }
      loadProduct(this.form, product, this.languages);
      this.form.markAsPristine();
    });
  }

  // Slug and categories ----------------------------------------------------------------------------

  onSlugInput(): void {
    this.slugEditedByUser = true;
  }

  formatSlug(): void {
    const control = this.form.controls.titleUrl;
    control.setValue(slugFromTitle(control.value));
  }

  addCategory(name: string): void {
    const slug = categorySlug(name);
    if (!slug) return;
    const tags = this.form.controls.tags;
    if (!tags.value.includes(slug)) {
      tags.setValue([...tags.value, slug]);
      tags.markAsDirty();
    }
    this.aiSuggestions.update((list) => list.filter((c) => categorySlug(c) !== slug));
    this.categoryQuery.set('');
  }

  onCategoryInput(event: { value: string; chipInput: { clear(): void } }): void {
    if (event.value.trim()) this.addCategory(event.value);
    event.chipInput.clear();
  }

  onCategorySelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    this.addCategory(event.option.value);
    input.value = '';
  }

  removeCategory(tag: string): void {
    const tags = this.form.controls.tags;
    tags.setValue(tags.value.filter((t) => t !== tag));
    tags.markAsDirty();
  }

  // Images -----------------------------------------------------------------------------------------

  setImages(images: string[]): void {
    this.form.controls.images.setValue(images);
    this.form.controls.images.markAsDirty();
  }

  setMainImage(image: string): void {
    this.form.controls.mainImage.setValue(image);
    this.form.controls.mainImage.markAsDirty();
  }

  // Descriptions -----------------------------------------------------------------------------------

  descriptionControl(lang: string): FormControl<string> {
    return this.form.controls.langs.controls[lang].controls.descriptionFull;
  }

  onEditorChange(lang: string, html: string): void {
    const control = this.descriptionControl(lang);
    if (control.value === html) return;
    control.setValue(html);
    control.markAsDirty();
  }

  toggleHtml(lang: string, html: boolean): void {
    this.htmlMode.update((modes) => ({ ...modes, [lang]: html }));
  }

  // AI ---------------------------------------------------------------------------------------------

  isAi(lang: string, field: string): boolean {
    return this.aiMarks().has(langPath(lang, field));
  }

  isAiPath(path: string): boolean {
    return this.aiMarks().has(path);
  }

  fillWithAi(request: AiFillRequest): void {
    this.aiError.set('');
    this.aiBusy.set(true);
    this.form.disable({ emitEvent: false });
    this.aiRequest = this.api
      .createAiDraft({
        imageUrls: this.aiImages(),
        ...(request.text ? { text: request.text } : {}),
        ...(request.supplierText ? { supplierText: request.supplierText } : {}),
      })
      .subscribe((response) => {
        this.finishAi();
        if (response.error) {
          this.aiError.set(errorMessage(response.error, 'The AI request failed. Try again.'));
          return;
        }
        this.applyingDraft = true;
        const filled = applyDraft(this.form, response.draft, {
          languages: this.languages,
          overwrite: this.isNew() || request.overwrite,
          titleUrlEditable: this.isNew() && !this.slugEditedByUser,
        });
        this.applyingDraft = false;
        // From now on the slug stays as the AI suggested unless the admin edits it
        if (filled.has('titleUrl')) this.slugEditedByUser = true;
        this.aiMarks.set(filled);
        this.aiWarnings.set(response.warnings);
        this.aiSuggestions.set(response.suggestedCategories);
        // Show the first language that got AI texts
        const firstLang = this.languages.findIndex((lang) => [...filled.keys()].some((p) => p.startsWith(`langs.${lang}.`)));
        if (firstLang >= 0) this.selectedTab.set(firstLang);
        if (!filled.size) {
          this.aiError.set('The AI had nothing new to add: all its fields are already filled. Tick "Replace texts" to overwrite them.');
        }
        this.aiAssistant()?.focusSummary();
      });
  }

  cancelAi(): void {
    this.aiRequest?.unsubscribe();
    this.finishAi();
    this.aiError.set('Cancelled.');
  }

  private finishAi(): void {
    this.aiBusy.set(false);
    this.form.enable({ emitEvent: false });
    if (!this.isNew()) this.form.controls.titleUrl.disable({ emitEvent: false });
  }

  acceptAi(paths?: string[]): void {
    this.aiMarks.update((marks) => {
      const next = new Map(marks);
      (paths ?? [...marks.keys()]).forEach((path) => next.delete(path));
      return next;
    });
  }

  acceptAiLanguage(lang: string): void {
    this.acceptAi([...this.aiMarks().keys()].filter((path) => path.startsWith(`langs.${lang}.`)));
  }

  private pruneAiMarks(): void {
    const marks = this.aiMarks();
    if (!marks.size) return;
    const changed = [...marks.entries()].filter(([path, value]) => this.form.get(path)?.value !== value).map(([path]) => path);
    if (changed.length) this.acceptAi(changed);
  }

  // Save / delete ----------------------------------------------------------------------------------

  async save(): Promise<void> {
    this.saveError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.saveError.set('Some fields need attention. They are marked in red.');
      const firstInvalid = this.languages.findIndex((lang) => this.form.controls.langs.controls[lang].invalid);
      if (this.form.controls.titleUrl.invalid || firstInvalid < 0) {
        this.focusFirstInvalid();
      } else {
        this.selectedTab.set(firstInvalid);
        setTimeout(() => this.focusFirstInvalid(), 50);
      }
      return;
    }
    if (this.aiPendingCount() && !this.confirmUnreviewed()) {
      this.confirmUnreviewed.set(true);
      // The confirmation replaces the Save button; keep keyboard focus in the footer
      setTimeout(() => this.formEl().nativeElement.querySelector<HTMLElement>('.editor-confirm button')?.focus());
      return;
    }
    this.confirmUnreviewed.set(false);

    const product = toProductInput(this.form, this.languages);
    this.saving.set(true);
    const response = await firstValueFrom(this.isNew() ? this.api.addProduct(product) : this.api.editProduct(product));
    this.saving.set(false);
    if (response?.error) {
      const status = (response.error as HttpErrorResponse).status;
      this.saveError.set(
        status === 400 && this.isNew()
          ? 'A product with this URL already exists. Change the URL.'
          : errorMessage(response.error, 'Saving failed. Try again.'),
      );
      return;
    }

    this.aiMarks.set(new Map());
    this.form.markAsPristine();
    this.saved = true;
    this.store.getAllProducts();
    this.snackBar.open('Product saved', undefined, { duration: 3000, politeness: 'polite' });
    if (this.isNew()) {
      void this.router.navigate([`/${this.lang()}/dashboard/products`, product.titleUrl]);
    } else {
      this.saved = false;
    }
  }

  async remove(): Promise<void> {
    if (!confirm(`Delete "${this.titleUrl()}"? This cannot be undone.`)) return;
    const response = await firstValueFrom(this.api.removeProduct(this.titleUrl()!));
    if (response?.error) {
      this.saveError.set(errorMessage(response.error, 'Deleting failed. Try again.'));
      return;
    }
    this.saved = true;
    this.store.getAllProducts();
    this.snackBar.open('Product deleted', undefined, { duration: 3000, politeness: 'polite' });
    void this.router.navigateByUrl(this.listLink());
  }

  private focusFirstInvalid(): void {
    this.formEl().nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, mat-select.ng-invalid')?.focus();
  }

  /** Used by the route's canDeactivate guard */
  hasUnsavedChanges(): boolean {
    return !this.saved && (this.form.dirty || this.aiBusy());
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}
