import { Component, ChangeDetectionStrategy, inject, input, output } from '@angular/core';
import { Observable } from 'rxjs';

import { EnvConfigurationService } from '../../../services/env-configuration.service';
import { EditorComponent } from '@tinymce/tinymce-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-tiny-editor',
  templateUrl: './tiny-editor.component.html',
  styleUrls: ['./tiny-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [EditorComponent, ReactiveFormsModule, FormsModule, AsyncPipe],
})
export class TinyEditorComponent {
  editorApiKey$: Observable<string>;

  readonly description = input('');
  readonly editorContentChange = output<string>();

  constructor() {
    const envConfigurationService = inject(EnvConfigurationService);

    this.editorApiKey$ = envConfigurationService.getConfigType$('FE_TINYMCE_API_KEY');
  }

  onEditorChange(value: string): void {
    this.editorContentChange.emit(value);
  }
}
