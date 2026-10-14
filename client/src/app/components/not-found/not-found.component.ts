import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class NotFoundComponent {
  constructor() {
    console.log('NOT FOUND 404');
  }
}
