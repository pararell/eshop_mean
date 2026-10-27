import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import type { ThemeStyles } from '@eshop/shared';
import { MatDialog } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatIcon } from '@angular/material/icon';

import { ThemeService } from '../../../services/theme.service';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { SignalStore } from '../../../store/signal.store';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { AdminItemListComponent, AdminListItem } from '../admin-ui/admin-item-list.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';
import { languages } from '../../../shared/constants';

/** The theme settings this editor shows (the server keeps the other stored keys on save) */
const STYLE_FIELDS = [
  'primaryColor',
  'shopName',
  'logo',
  'promoSlideBackground',
  'promoSlideVideo',
  'promoSlideBackgroundPosition',
  'heroTint',
  'promo',
  'promoImage',
  'promoLink',
  ...languages.flatMap((lang) => [`promoTitle_${lang}`, `promoText_${lang}`] as const),
] as const satisfies readonly (keyof ThemeStyles)[];

const STYLE_DEFAULTS: ThemeStyles = { promoSlideBackgroundPosition: 'center', heroTint: 'none', promo: 'none' };
/** Shown in the color picker while the default ink is used */
const PICKER_START = '#15803d';

// The same rules as the server (server/src/eshop/theme-styles.ts); empty is always allowed
const httpsUrl = Validators.pattern(/^(https:\/\/\S+)?$/);
const shopPathOrHttps = Validators.pattern(/^((\/(?!\/)\S*)|(https:\/\/\S+))?$/);
const FIELD_VALIDATORS: Partial<Record<(typeof STYLE_FIELDS)[number], ValidatorFn[]>> = {
  shopName: [Validators.maxLength(60)],
  logo: [httpsUrl],
  promoSlideBackground: [httpsUrl],
  promoSlideVideo: [httpsUrl],
  promoImage: [httpsUrl],
  promoLink: [shopPathOrHttps],
  ...Object.fromEntries(
    languages.flatMap((lang) => [
      [`promoTitle_${lang}`, [Validators.maxLength(120)]] as const,
      [`promoText_${lang}`, [Validators.maxLength(300)]] as const,
    ]),
  ),
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
    AdminPageHeaderComponent,
    AdminItemListComponent,
  ],
})
export class ThemeEditComponent {
  private store = inject(SignalStore);
  private selectos = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);
  private themeService = inject(ThemeService);

  private dialog = inject(MatDialog);
  readonly languages = languages;
  themesEditForm: FormGroup;
  readonly themes = computed(() => {
    const list = this.selectos.themes();
    return Array.isArray(list) ? list : [];
  });
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
    inject(DestroyRef).onDestroy(() => this.restoreActiveTheme());
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
    return styles;
  }

  /** Back to what the shop shows: the active theme (or the default look without one) */
  private restoreActiveTheme(): void {
    this.themeService.applyStyles(this.themes().find((theme) => theme.active)?.styles ?? {});
  }
}
