import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
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

/** Theme settings that are text, not styles: shop name, hero tint and the promo banner (per language) */
const CONTENT_FIELDS = [
  'shopName',
  'heroTint',
  'promoImage',
  'promoLink',
  ...languages.flatMap((lang) => [`promoTitle_${lang}`, `promoText_${lang}`]),
];

/**
 * Themes: list + editor. Changes preview live on the page (ThemeService CSS variables), as
 * before; only the active theme is used by the shop.
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
      ...this.startFormValues(),
    });

    this.themesEditForm.valueChanges.subscribe((values) => {
      this.themeService.setCSSVariable(values.primaryColor, 'primary-color');
      this.themeService.setCSSVariable(values.secondaryColor, 'secondary-color');
      this.themeService.setCSSVariable(values.backgroundColor, 'background-color');
      this.themeService.setThemeColor(values.primaryColor, 'theme-primary');
      this.themeService.setThemeColor(values.secondaryColor, 'theme-secondary');
      if (values.mainBackground) {
        this.themeService.setCSSVariable(values.mainBackground, 'main-background');
        this.themeService.setCSSVariable(`url(${values.mainBackground})`, 'main-background-url');
      } else {
        this.themeService.setCSSVariable(`url(/)`, 'main-background-url');
      }
      this.themeService.setCSSVariable(values.freeShippingPromo, 'free-shipping-promo');
      this.themeService.setCSSVariable(`url(${values.promoSlideBackground})`, 'promo-slide-background');
      this.themeService.setCSSVariable(`${values.promoSlideBackgroundPosition}`, 'promo-slide-background-position');
      this.themeService.setVideo(values.promoSlideVideo);
      this.themeService.setCSSVariable(values.promo, 'promo');
      this.themeService.setCSSVariable(`url(${values.logo})`, 'logo');
    });
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
    const styles = found?.styles;
    const defaults = this.startFormValues();
    this.themesEditForm.reset({
      titleUrl: found?.titleUrl ?? '',
      active: found ? !!found.active : defaults.active,
      freeShippingPromo: styles?.freeShippingPromo || defaults.freeShippingPromo,
      promoSlideBackground: styles?.promoSlideBackground || '',
      promoSlideVideo: styles?.promoSlideVideo || '',
      promoSlideBackgroundPosition: styles?.promoSlideBackgroundPosition || defaults.promoSlideBackgroundPosition,
      promo: styles?.promo || defaults.promo,
      primaryColor: styles?.primaryColor || (found ? '' : defaults.primaryColor),
      secondaryColor: styles?.secondaryColor || (found ? '' : defaults.secondaryColor),
      backgroundColor: styles?.backgroundColor || (found ? '' : defaults.backgroundColor),
      mainBackground: styles?.mainBackground || '',
      logo: styles?.logo || '',
      ...Object.fromEntries(CONTENT_FIELDS.map((field) => [field, styles?.[field] || defaults[field as keyof typeof defaults] || ''])),
    });
    if (found) this.themesEditForm.get('titleUrl')!.disable();
    else this.themesEditForm.get('titleUrl')!.enable();
    this.selected.set(titleUrl);
  }

  saveTheme(): void {
    if (this.themesEditForm.invalid) {
      this.themesEditForm.markAllAsTouched();
      return;
    }
    const formValues = this.themesEditForm.getRawValue();
    const request = {
      titleUrl: formValues.titleUrl,
      active: formValues.active,
      styles: {
        primaryColor: formValues.primaryColor,
        promoSlideBackground: formValues.promoSlideBackground,
        promoSlideVideo: formValues.promoSlideVideo || '',
        promoSlideBackgroundPosition: formValues.promoSlideBackgroundPosition,
        secondaryColor: formValues.secondaryColor,
        backgroundColor: formValues.backgroundColor,
        mainBackground: formValues.mainBackground,
        freeShippingPromo: formValues.freeShippingPromo,
        promo: formValues.promo,
        logo: formValues.logo,
        ...Object.fromEntries(CONTENT_FIELDS.map((field) => [field, (formValues[field] as string)?.trim() ?? ''])),
      },
    };
    this.store.addOrEditTheme(request);
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
  }

  private startFormValues() {
    return {
      active: false,
      freeShippingPromo: 'none',
      promoSlideBackground: '',
      promoSlideVideo: '',
      promoSlideBackgroundPosition: 'center',
      promo: 'none',
      primaryColor: '#15803d',
      secondaryColor: '#cccccc',
      backgroundColor: '#eeeeee',
      mainBackground: '',
      logo: '',
      ...Object.fromEntries(CONTENT_FIELDS.map((field) => [field, ''])),
      heroTint: 'none',
    };
  }
}
