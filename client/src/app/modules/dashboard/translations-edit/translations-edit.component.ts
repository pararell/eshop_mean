import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatIcon } from '@angular/material/icon';

import type { LanguageCode } from '@eshop/shared';
import { languages } from '../../../shared/constants';
import { SignalStore } from '../../../store/signal.store';
import { SignalStoreSelectors } from '../../../store/signal.store.selectors';
import { AdminPageHeaderComponent } from '../admin-ui/admin-page-header.component';
import { confirmAction } from '../admin-ui/confirm-dialog.component';

type Texts = Record<LanguageCode, Record<string, string>>;
const emptyTexts = (): Texts => Object.fromEntries(languages.map((lang) => [lang, {}])) as Texts;

/**
 * UI texts of the shop: one row per key, one column per language. Search, "missing only",
 * add/remove keys, and a JSON mode for bulk edits. Saving sends every language
 * (`PATCH /api/translations/all`), as before.
 */
@Component({
  selector: 'app-translations-edit',
  templateUrl: './translations-edit.component.html',
  styleUrls: ['./translations-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatFormField, MatLabel, MatHint, MatInput, MatSlideToggle, MatPaginator, MatIcon, AdminPageHeaderComponent],
})
export class TranslationsEditComponent {
  private store = inject(SignalStore);
  private selectors = inject(SignalStoreSelectors);
  private dialog = inject(MatDialog);

  readonly languages = languages;
  readonly texts = signal<Texts>(emptyTexts());
  readonly dirty = signal(false);
  readonly query = signal('');
  readonly missingOnly = signal(false);
  readonly newKey = signal('');
  readonly pageIndex = signal(0);
  readonly pageSize = signal(50);
  readonly jsonMode = signal(false);
  readonly json = signal<Record<string, string>>({});
  readonly jsonError = signal('');

  readonly keys = computed(() => [...new Set(languages.flatMap((lang) => Object.keys(this.texts()[lang])))].sort((a, b) => a.localeCompare(b)));
  readonly isMissing = (key: string) => languages.some((lang) => !this.texts()[lang][key]?.trim());
  readonly missingCount = computed(() => this.keys().filter((key) => this.isMissing(key)).length);
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.keys().filter(
      (key) =>
        (!this.missingOnly() || this.isMissing(key)) &&
        (!query || key.toLowerCase().includes(query) || languages.some((lang) => (this.texts()[lang][key] ?? '').toLowerCase().includes(query))),
    );
  });
  readonly page = computed(() => this.filtered().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  constructor() {
    this.store.getAllTranslations();
    // Load (and reload after saving) unless there are unsaved edits
    effect(() => {
      const list = this.selectors.translations();
      if (untracked(this.dirty)) return;
      const texts = emptyTexts();
      for (const translation of Array.isArray(list) ? list : []) {
        if ((languages as string[]).includes(translation.lang)) texts[translation.lang as LanguageCode] = { ...(translation.keys ?? {}) };
      }
      this.texts.set(texts);
    });
  }

  setText(lang: LanguageCode, key: string, value: string): void {
    this.texts.update((texts) => ({ ...texts, [lang]: { ...texts[lang], [key]: value } }));
    this.dirty.set(true);
  }

  addKey(): void {
    const key = this.newKey().trim();
    if (!key || this.keys().includes(key)) return;
    this.texts.update((texts) => Object.fromEntries(languages.map((lang) => [lang, { ...texts[lang], [key]: '' }])) as Texts);
    this.dirty.set(true);
    this.newKey.set('');
    this.query.set(key);
    this.pageIndex.set(0);
  }

  async removeKey(key: string): Promise<void> {
    const confirmed = await confirmAction(this.dialog, {
      title: 'Remove text?',
      message: `"${key}" is removed in every language when you save. Pages that use it show the key instead.`,
      confirm: 'Remove',
      danger: true,
    });
    if (!confirmed) return;
    this.texts.update(
      (texts) =>
        Object.fromEntries(languages.map((lang) => [lang, Object.fromEntries(Object.entries(texts[lang]).filter(([k]) => k !== key))])) as Texts,
    );
    this.dirty.set(true);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  toggleJson(on: boolean): void {
    if (on) this.json.set(Object.fromEntries(languages.map((lang) => [lang, JSON.stringify(this.texts()[lang], null, 2)])));
    this.jsonError.set('');
    this.jsonMode.set(on);
  }

  setJson(lang: string, value: string): void {
    this.json.update((json) => ({ ...json, [lang]: value }));
  }

  save(): void {
    let texts = this.texts();
    if (this.jsonMode()) {
      try {
        texts = Object.fromEntries(
          languages.map((lang) => {
            const parsed: unknown = JSON.parse(this.json()[lang] || '{}');
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
              throw new Error(`${lang.toUpperCase()}: expected an object of "key": "text"`);
            return [lang, parsed as Record<string, string>];
          }),
        ) as Texts;
      } catch (error) {
        this.jsonError.set(`Not saved: ${(error as Error).message}`);
        return;
      }
      this.texts.set(texts);
    }
    this.store.editTranslation(languages.map((lang) => ({ lang, keys: texts[lang] })));
    this.dirty.set(false);
    this.jsonError.set('');
  }
}
