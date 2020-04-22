import { Component, Output, Input, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-tiny-editor',
  templateUrl: './tiny-editor.component.html',
  styleUrls: ['./tiny-editor.component.scss']
})
export class TinyEditorComponent {

  @Input() description = '';
  @Output() onEditorContentChange = new EventEmitter();

  constructor() { }

  onEditorChange(value) {
    this.onEditorContentChange.emit(value);
  }


}
