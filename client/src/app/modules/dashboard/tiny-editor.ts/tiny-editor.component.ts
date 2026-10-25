import { Component, ChangeDetectionStrategy, computed, inject, input, linkedSignal, output } from '@angular/core';
import { Observable } from 'rxjs';

import { EnvConfigurationService } from '../../../services/env-configuration.service';
import { ThemeService } from '../../../services/theme.service';
import { EditorComponent } from '@tinymce/tinymce-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

/**
 * TinyMCE (cloud) with the skin of the current color mode. TinyMCE reads `init` only once, so the
 * template recreates the editor when the mode changes; the text lives in `content`, so a switch
 * keeps unsaved edits.
 */
@Component({
  selector: 'app-tiny-editor',
  templateUrl: './tiny-editor.component.html',
  styleUrls: ['./tiny-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EditorComponent, ReactiveFormsModule, FormsModule, AsyncPipe],
})
export class TinyEditorComponent {
  private theme = inject(ThemeService);
  editorApiKey$: Observable<string>;

  readonly description = input('');
  readonly editorContentChange = output<string>();

  /** The editor's text: follows the input, and keeps what was typed */
  readonly content = linkedSignal(() => this.description());
  readonly dark = computed(() => this.theme.isDark());
  readonly init = computed(() => ({
    plugins: ['image', 'media', 'link', 'code'],
    skin: this.dark() ? 'oxide-dark' : 'oxide',
    content_css: this.dark() ? 'dark' : 'default',
  }));

  constructor() {
    const envConfigurationService = inject(EnvConfigurationService);

    this.editorApiKey$ = envConfigurationService.getConfigType$('FE_TINYMCE_API_KEY');
  }

  onEditorChange(value: string): void {
    this.content.set(value);
    this.editorContentChange.emit(value);
  }
}
