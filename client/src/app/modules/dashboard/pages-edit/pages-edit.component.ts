import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';

import type { LanguageCode } from '@eshop/shared';
import { languages } from '../../../shared/constants';
import { Page } from '../../../shared/models';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { TinyEditorComponent } from '../tiny-editor.ts/tiny-editor.component';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { AdminItemListComponent, AdminListItem } from '../admin-ui/admin-item-list.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';

/** Content pages (about, terms, …): list + editor with a title and rich text per language */
@Component({
  selector: 'app-pages-edit',
  templateUrl: './pages-edit.component.html',
  styleUrls: ['./pages-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
    MatTabGroup,
    MatTab,
    MatIcon,
    TinyEditorComponent,
    AdminPageHeaderComponent,
    AdminItemListComponent,
  ],
})
export class PagesEditComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  readonly languages = languages;
  readonly lang = this.selectors.appLang;
  readonly pages = computed(() => {
    const list = this.selectors.pages();
    return Array.isArray(list) ? list : [];
  });
  /** titleUrl of the open page; '' for a new one; null when nothing is open */
  readonly selected = signal<string | null>(null);

  readonly form: FormGroup = this.fb.group({
    titleUrl: ['', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/)]],
    ...Object.fromEntries(languages.map((lang) => [lang, this.fb.group({ title: '', contentHTML: '' })])),
  });

  readonly listItems = computed<AdminListItem[]>(() =>
    this.pages()
      .map((page) => ({ id: page.titleUrl, label: this.titleOf(page), meta: page.titleUrl }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  constructor() {
    this.store.getPages();
  }

  titleOf(page: Page): string {
    return page[this.lang() as LanguageCode]?.title || page.en?.title || page.titleUrl;
  }

  /** Current text of a language, for the rich-text editor */
  content(lang: string): string {
    return this.form.get([lang, 'contentHTML'])!.value ?? '';
  }

  async select(titleUrl: string): Promise<void> {
    if (this.selected() === titleUrl) return;
    if (
      this.form.dirty &&
      !(await confirmAction(this.dialog, {
        title: 'Discard changes?',
        message: 'The open page has unsaved changes.',
        confirm: 'Discard',
        danger: true,
      }))
    ) {
      return;
    }
    const found = this.pages().find((page) => page.titleUrl === titleUrl);
    this.form.reset({
      titleUrl: found?.titleUrl ?? '',
      ...Object.fromEntries(languages.map((lang) => [lang, { title: found?.[lang]?.title ?? '', contentHTML: found?.[lang]?.contentHTML ?? '' }])),
    });
    if (found) this.form.get('titleUrl')!.disable();
    else this.form.get('titleUrl')!.enable();
    this.selected.set(titleUrl);
  }

  onContentChange(content: string, lang: string): void {
    const control = this.form.get([lang, 'contentHTML'])!;
    if (control.value !== content) {
      control.setValue(content);
      this.form.markAsDirty();
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.store.addOrEditPage(value);
    this.form.markAsPristine();
    this.selected.set(value.titleUrl);
    this.form.get('titleUrl')!.disable();
  }

  async remove(): Promise<void> {
    const titleUrl = this.form.getRawValue().titleUrl as string;
    const confirmed = await confirmAction(this.dialog, {
      title: 'Delete page?',
      message: `"${titleUrl}" is removed in every language. Links to it stop working. This can't be undone.`,
      confirm: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    this.store.removePage(titleUrl);
    this.form.markAsPristine();
    this.selected.set(null);
  }
}
