import { Component, Output, Input, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { EnvConfigurationService } from '../../../services/env-configuration.service';

@Component({
  selector: 'app-tiny-editor',
  templateUrl: './tiny-editor.component.html',
  styleUrls: ['./tiny-editor.component.scss']
})
export class TinyEditorComponent {
  editorApiKey$: Observable<string>;

  @Input() description = '';
  @Output() editorContentChange = new EventEmitter();

  constructor(envConfigurationService: EnvConfigurationService) {
    this.editorApiKey$ = envConfigurationService.getConfigType$('FE_TINYMCE_API_KEY');
  }

  onEditorChange(value): void {
    this.editorContentChange.emit(value);
  }


}
