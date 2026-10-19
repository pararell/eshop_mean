import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { IconComponent } from '../icon/icon.component';

export interface ImagesDialogData {
  index: number;
  images: string[];
  alt?: string;
}

/** Full-screen image viewer; closes with the current index so the gallery can follow */
@Component({
  selector: 'app-images-dialog',
  templateUrl: './images-dialog.component.html',
  styleUrls: ['./images-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: {
    '(keydown.arrowleft)': 'prev()',
    '(keydown.arrowright)': 'next()',
  },
})
export class ImagesDialogComponent {
  private dialogRef = inject<MatDialogRef<ImagesDialogComponent, number>>(MatDialogRef);
  readonly data = inject<ImagesDialogData>(MAT_DIALOG_DATA);

  readonly index = signal(this.data.index);
  readonly current = computed(() => this.data.images[this.index()]);
  readonly count = this.data.images.length;
  /** Zoomed: the image at its natural size, scrollable */
  readonly zoomed = signal(false);

  prev(): void {
    this.go(this.index() - 1);
  }

  next(): void {
    this.go(this.index() + 1);
  }

  close(): void {
    this.dialogRef.close(this.index());
  }

  private go(index: number): void {
    this.zoomed.set(false);
    this.index.set((index + this.count) % this.count);
  }
}
