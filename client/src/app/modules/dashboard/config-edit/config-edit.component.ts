import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';

import { currencyLang, languages } from '../../../shared/constants';
import { LanguageCode } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { AdminItemListComponent, AdminListItem } from '../admin-ui/admin-item-list.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';

/**
 * Shop configs: shipping costs per language. Each product has a shipping type: "basic"
 * (standard) or "extended" (bulky); a cart with any bulky item pays the bulky rate. Shipping is
 * free from the given order total. Only the active config is used.
 */
@Component({
  selector: 'app-config-edit',
  templateUrl: './config-edit.component.html',
  styleUrls: ['./config-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatHint,
    MatSuffix,
    MatInput,
    MatSlideToggle,
    MatTabGroup,
    MatTab,
    MatIcon,
    AdminPageHeaderComponent,
    AdminItemListComponent,
  ],
})
export class ConfigEditComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  readonly languageOptions = languages;
  readonly currencyLang = currencyLang;
  readonly configs = computed(() => {
    const list = this.selectors.configs();
    return Array.isArray(list) ? list : [];
  });
  /** titleUrl of the open config; '' for a new one; null when nothing is open */
  readonly selected = signal<string | null>(null);
  readonly listItems = computed<AdminListItem[]>(() =>
    this.configs()
      .map((config) => ({ id: config.titleUrl, label: config.titleUrl, meta: config.active ? 'active' : '' }))
      .sort((a, b) => Number(!!b.meta) - Number(!!a.meta) || a.label.localeCompare(b.label)),
  );

  readonly configEditForm: FormGroup = this.fb.group({
    titleUrl: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    active: false,
    ...this.createLangForm(this.languageOptions),
  });

  constructor() {
    this.store.getConfigs();
  }

  async select(titleUrl: string): Promise<void> {
    if (this.selected() === titleUrl) return;
    if (
      this.configEditForm.dirty &&
      !(await confirmAction(this.dialog, {
        title: 'Discard changes?',
        message: 'The open config has unsaved changes.',
        confirm: 'Discard',
        danger: true,
      }))
    ) {
      return;
    }
    const found = this.configs().find((config) => config.titleUrl === titleUrl);
    this.configEditForm.reset({
      titleUrl: found?.titleUrl ?? '',
      active: !!found?.active,
      ...Object.fromEntries(
        this.languageOptions.map((lang) => {
          const shipping = found?.[lang as LanguageCode]?.shippingCost;
          return [
            lang,
            {
              basicShippingCost: shipping?.basic.cost || 0,
              basicShippingLimit: shipping?.basic.limit || 0,
              extendedShippingCost: shipping?.extended.cost || 0,
              extendedShippingLimit: shipping?.extended.limit || 0,
            },
          ];
        }),
      ),
    });
    if (found) this.configEditForm.get('titleUrl')!.disable();
    else this.configEditForm.get('titleUrl')!.enable();
    this.selected.set(titleUrl);
  }

  saveConfig(): void {
    if (this.configEditForm.invalid) {
      this.configEditForm.markAllAsTouched();
      return;
    }
    const formValues = this.configEditForm.getRawValue();
    const request = {
      titleUrl: formValues.titleUrl,
      active: formValues.active,
      ...this.languageOptions
        .map((lang: string) => ({
          [lang]: {
            shippingCost: {
              basic: { cost: formValues[lang].basicShippingCost, limit: formValues[lang].basicShippingLimit },
              extended: { cost: formValues[lang].extendedShippingCost, limit: formValues[lang].extendedShippingLimit },
            },
          },
        }))
        .reduce((prev, curr) => ({ ...prev, ...curr }), {}),
    };
    this.store.addOrEditConfig(request);
    this.configEditForm.markAsPristine();
    this.selected.set(formValues.titleUrl);
    this.configEditForm.get('titleUrl')!.disable();
  }

  async removeConfig(): Promise<void> {
    const titleUrl = this.configEditForm.getRawValue().titleUrl as string;
    const confirmed = await confirmAction(this.dialog, {
      title: 'Delete shop config?',
      message: `"${titleUrl}" is deleted. If it is the active config, the shop falls back to the built-in shipping costs.`,
      confirm: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.store.removeConfig(titleUrl);
    this.configEditForm.markAsPristine();
    this.selected.set(null);
  }

  private createLangForm(languageOptions: Array<string>) {
    return languageOptions
      .map((lang: string) => ({
        [lang]: this.fb.group({
          basicShippingCost: [0, Validators.min(0)],
          basicShippingLimit: [0, Validators.min(0)],
          extendedShippingCost: [0, Validators.min(0)],
          extendedShippingLimit: [0, Validators.min(0)],
        }),
      }))
      .reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }
}
