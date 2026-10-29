import { FormArray, FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import type { AiThemeDraft, ThemeStyles } from '@eshop/shared';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { ThemeService } from '../../../services/theme.service';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { SignalStore } from '../../../store/signal.store';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { AdminItemListComponent, AdminListItem } from '../admin-ui/admin-item-list.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';
import { editableHomeSections, newBand } from '../../../shared/home-layout';
import { ApiService } from '../../../services/api.service';
import { errorMessage } from '../admin-ui/error-message';
import { THEME_PRESETS, ThemePreset } from './theme-presets';
import { HomeSectionsEditorComponent } from './home-sections-editor/home-sections-editor.component';
import { httpsUrl, sectionGroup, sectionsArray, SectionsArray, sectionsFromArray } from './home-sections-form';
import { ListingEditorComponent } from './listing-editor/listing-editor.component';
import { ListingGroup, listingFromGroup, listingGroup } from './listing-form';

/**
 * The text settings this editor shows, besides the home sections (`home`) and the product pages (`listing`). The server keeps the other
 * stored keys on save, such as the old promo banner settings (promo*), which `home` replaces.
 */
const STYLE_FIELDS = [
  'primaryColor',
  'shopName',
  'logo',
  'promoSlideBackground',
  'promoSlideVideo',
  'promoSlideBackgroundPosition',
  'heroTint',
] as const satisfies readonly (keyof ThemeStyles)[];

const STYLE_DEFAULTS: ThemeStyles = { promoSlideBackgroundPosition: 'center', heroTint: 'none' };
/** Shown in the color picker while the default ink is used */
const PICKER_START = '#15803d';

// The same rules as the server (server/src/eshop/theme-styles.ts); empty is always allowed
const FIELD_VALIDATORS: Partial<Record<(typeof STYLE_FIELDS)[number], ValidatorFn[]>> = {
  shopName: [Validators.maxLength(60)],
  logo: [httpsUrl],
  promoSlideBackground: [httpsUrl],
  promoSlideVideo: [httpsUrl],
};

/**
 * Themes: list + editor. The open theme previews live on the page (ThemeService.applyStyles); the
 * active theme is put back when another one is opened, the open one is closed or the editor is left.
 * Only the active theme is used by the shop.
 */
@Component({
  selector: 'app-theme-edit',
  templateUrl: './theme-edit.component.html',
  styleUrls: ['./theme-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSelect,
    MatOption,
    MatSlideToggle,
    MatIcon,
    MatProgressSpinner,
    AdminPageHeaderComponent,
    AdminItemListComponent,
    HomeSectionsEditorComponent,
    ListingEditorComponent,
  ],
})
export class ThemeEditComponent {
  private store = inject(SignalStore);
  private selectos = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);
  private themeService = inject(ThemeService);
  private api = inject(ApiService);

  private dialog = inject(MatDialog);
  themesEditForm: FormGroup;
  readonly themes = computed(() => {
    const list = this.selectos.themes();
    return Array.isArray(list) ? list : [];
  });
  readonly presets = THEME_PRESETS;
  /** AI theme drafts are available (an AI provider is configured) */
  readonly aiEnabled = signal(false);
  readonly aiBusy = signal(false);
  readonly aiError = signal('');
  /** What the last draft changed, for the admin to review */
  readonly aiResult = signal('');
  readonly aiBrief = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(500)] });
  private aiRequest?: Subscription;
  /** titleUrl of the open theme; '' for a new one; null when nothing is open */
  readonly selected = signal<string | null>(null);
  readonly listItems = computed<AdminListItem[]>(() =>
    this.themes()
      .map((theme) => ({ id: theme.titleUrl, label: theme.titleUrl, meta: theme.active ? 'active' : '' }))
      .sort((a, b) => Number(!!b.meta) - Number(!!a.meta) || a.label.localeCompare(b.label)),
  );

  constructor() {
    this.store.getThemes();

    this.themesEditForm = this.fb.group({
      titleUrl: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
      active: false,
      useDefaultColor: true,
      ...Object.fromEntries(STYLE_FIELDS.map((field) => [field, ['', FIELD_VALIDATORS[field] ?? []]])),
      home: sectionsArray([]),
      listing: listingGroup(undefined),
    });

    this.themesEditForm.get('primaryColor')!.disable();
    // The picker only counts when the default ink is off
    this.themesEditForm.get('useDefaultColor')!.valueChanges.subscribe((useDefault: boolean) => {
      const picker = this.themesEditForm.get('primaryColor')!;
      if (useDefault) picker.disable({ emitEvent: false });
      else picker.enable({ emitEvent: false });
    });
    this.themesEditForm.valueChanges.subscribe(() => {
      if (this.selected() !== null) this.themeService.applyStyles(this.stylesFromForm());
    });
    inject(DestroyRef).onDestroy(() => {
      this.aiRequest?.unsubscribe();
      this.restoreActiveTheme();
    });
    this.api.getAiStatus().subscribe((status) => this.aiEnabled.set(!status.error && status.enabled));
  }

  /** Sets the look of a preset (accent color and hero tint); everything else stays */
  applyPreset(preset: ThemePreset): void {
    this.themesEditForm.patchValue({
      useDefaultColor: !preset.primaryColor,
      ...(preset.primaryColor ? { primaryColor: preset.primaryColor } : {}),
      heroTint: preset.heroTint,
    });
    this.themesEditForm.markAsDirty();
  }

  /** Asks the AI for a look and a photo band; the result fills the form, nothing is saved */
  draftWithAi(): void {
    if (this.aiBrief.invalid || this.aiBusy()) {
      this.aiBrief.markAsTouched();
      return;
    }
    this.aiError.set('');
    this.aiResult.set('');
    this.aiBusy.set(true);
    this.aiRequest = this.api.createAiThemeDraft({ brief: this.aiBrief.value.trim() }).subscribe((response) => {
      this.aiBusy.set(false);
      if (response.error) {
        this.aiError.set(errorMessage(response.error, 'The AI request failed. Try again.'));
        return;
      }
      this.aiResult.set(this.applyAiDraft(response.draft));
    });
  }

  cancelAi(): void {
    this.aiRequest?.unsubscribe();
    this.aiBusy.set(false);
  }

  /** Fills the form from an AI draft: color, tint, the shop name when empty, and a new photo band */
  private applyAiDraft(draft: AiThemeDraft): string {
    const changed = ['the brand color', 'the photo colors'];
    this.themesEditForm.patchValue({ useDefaultColor: false, primaryColor: draft.primaryColor, heroTint: draft.heroTint });
    if (draft.shopName && !String(this.themesEditForm.get('shopName')!.value ?? '').trim()) {
      this.themesEditForm.patchValue({ shopName: draft.shopName });
      changed.push('the shop name');
    }
    const band = newBand(sectionsFromArray(this.homeSections));
    if (band.type === 'band') {
      band.text = draft.band;
      // A new array, so the sections editor (OnPush) shows the band
      this.themesEditForm.setControl('home', new FormArray([...this.homeSections.controls, sectionGroup(band)]));
      changed.push('a photo band at the end of the home sections (add its photo)');
    }
    this.themesEditForm.markAsDirty();
    return `Filled ${changed.join(', ')}. Review the preview and save.`;
  }

  /** Opens a theme (or a new one with defaults, id '') in the form */
  async select(titleUrl: string): Promise<void> {
    if (this.selected() === titleUrl) return;
    if (
      this.themesEditForm.dirty &&
      !(await confirmAction(this.dialog, {
        title: 'Discard changes?',
        message: 'The open theme has unsaved changes.',
        confirm: 'Discard',
        danger: true,
      }))
    ) {
      return;
    }
    const found = this.themes().find((theme) => theme.titleUrl === titleUrl);
    const styles: ThemeStyles = found?.styles ?? {};
    this.selected.set(titleUrl);
    this.themesEditForm.reset({
      titleUrl: found?.titleUrl ?? '',
      active: found ? !!found.active : false,
      useDefaultColor: !styles.primaryColor,
      ...Object.fromEntries(STYLE_FIELDS.map((field) => [field, styles[field] || STYLE_DEFAULTS[field] || ''])),
      primaryColor: styles.primaryColor || PICKER_START,
    });
    // A new array (not a reset): the number of sections differs per theme
    this.themesEditForm.setControl('home', sectionsArray(editableHomeSections(styles)));
    this.themesEditForm.setControl('listing', listingGroup(styles.listing));
    if (found) this.themesEditForm.get('titleUrl')!.disable();
    else this.themesEditForm.get('titleUrl')!.enable();
  }

  saveTheme(): void {
    if (this.themesEditForm.invalid) {
      this.themesEditForm.markAllAsTouched();
      return;
    }
    const formValues = this.themesEditForm.getRawValue();
    this.store.addOrEditTheme({ titleUrl: formValues.titleUrl, active: formValues.active, styles: this.stylesFromForm() });
    this.themesEditForm.markAsPristine();
    this.selected.set(formValues.titleUrl);
    this.themesEditForm.get('titleUrl')!.disable();
  }

  async removeTheme(): Promise<void> {
    const titleUrl = this.themesEditForm.getRawValue().titleUrl as string;
    const confirmed = await confirmAction(this.dialog, {
      title: 'Delete theme?',
      message: `"${titleUrl}" is deleted. If it is the active theme, the shop falls back to the default look.`,
      confirm: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.store.removeTheme(titleUrl);
    this.themesEditForm.markAsPristine();
    this.selected.set(null);
    this.restoreActiveTheme();
  }

  /** The settings in the form, as saved (trimmed; the default ink is an empty color) */
  private stylesFromForm(): ThemeStyles {
    const values = this.themesEditForm.getRawValue();
    const styles = Object.fromEntries(STYLE_FIELDS.map((field) => [field, String(values[field] ?? '').trim()])) as ThemeStyles;
    styles.primaryColor = values.useDefaultColor ? '' : styles.primaryColor;
    styles.home = sectionsFromArray(this.homeSections);
    styles.listing = listingFromGroup(this.listing);
    return styles;
  }

  /** The `home` FormArray (replaced when a theme is opened) */
  get homeSections(): SectionsArray {
    return this.themesEditForm.get('home') as SectionsArray;
  }

  /** The `listing` group (replaced when a theme is opened) */
  get listing(): ListingGroup {
    return this.themesEditForm.get('listing') as ListingGroup;
  }

  /** Back to what the shop shows: the active theme (or the default look without one) */
  private restoreActiveTheme(): void {
    this.themeService.applyStyles(this.themes().find((theme) => theme.active)?.styles ?? {});
  }
}
